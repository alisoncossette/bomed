import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { required, validAppointmentType, badRequest, notFound } from '@/lib/validate';
import { relaySend } from '@/lib/bolo';

// GET /api/appointments — List appointments with optional filters
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const practiceId = sp.get('practiceId');
  const practitionerId = sp.get('practitionerId');
  const patientId = sp.get('patientId');
  const status = sp.get('status');
  const upcoming = sp.get('upcoming');
  const limit = Math.min(Number(sp.get('limit') || 100), 500);
  const offset = Number(sp.get('offset') || 0);

  const where: Record<string, unknown> = {};
  if (practiceId) where.practiceId = practiceId;
  if (practitionerId) where.practitionerId = practitionerId;
  if (patientId) where.patientId = patientId;
  if (status) where.status = status.toUpperCase();
  if (upcoming === 'true') {
    where.dateTime = { gte: new Date() };
    where.status = { in: ['PENDING', 'CONFIRMED'] };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        practitioner: { select: { id: true, name: true, handle: true, specialty: true } },
        patient: { select: { id: true, name: true, handle: true, email: true } },
      },
      orderBy: { dateTime: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({ data: appointments, total, limit, offset });
}

// POST /api/appointments — Create appointment (+ optional relay notification)
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const errors = required(body, ['practitionerId', 'patientId', 'practiceId', 'dateTime']);
  if (body.type && !validAppointmentType(body.type)) {
    errors.push({ field: 'type', message: 'Must be PT_SESSION, EVALUATION, or FOLLOW_UP' });
  }
  if (errors.length) return badRequest(errors);

  const { practitionerId, patientId, practiceId, dateTime, duration = 30, type = 'PT_SESSION', notes, recurring = false, recurringWeeks = 0 } = body;

  // Verify practitioner and patient exist and belong to the practice
  const [practitioner, patient] = await Promise.all([
    prisma.practitioner.findUnique({ where: { id: practitionerId } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!practitioner || practitioner.practiceId !== practiceId) return notFound('Practitioner in this practice');
  if (!patient || patient.practiceId !== practiceId) return notFound('Patient in this practice');

  const appointmentStart = new Date(dateTime);
  const appointmentEnd = new Date(appointmentStart.getTime() + Number(duration) * 60000);

  // Check for double-booking (overlapping appointments for this practitioner)
  const conflicting = await prisma.appointment.findFirst({
    where: {
      practitionerId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      dateTime: { lt: appointmentEnd },
      // appointment ends after our start: existing.dateTime + existing.duration > our start
    },
  });

  if (conflicting) {
    const existingEnd = new Date(conflicting.dateTime.getTime() + conflicting.duration * 60000);
    if (existingEnd > appointmentStart) {
      return NextResponse.json({
        error: 'Scheduling conflict',
        conflict: {
          appointmentId: conflicting.id,
          dateTime: conflicting.dateTime,
          duration: conflicting.duration,
          status: conflicting.status,
        },
      }, { status: 409 });
    }
  }

  // Check practitioner is working that day/time (if schedule exists)
  const dayOfWeek = appointmentStart.getDay();
  const timeStr = appointmentStart.toTimeString().slice(0, 5); // "HH:MM"
  const scheduleEntry = await prisma.practitionerSchedule.findUnique({
    where: { practitionerId_dayOfWeek: { practitionerId, dayOfWeek } },
  });

  if (scheduleEntry) {
    if (timeStr < scheduleEntry.startTime || timeStr >= scheduleEntry.endTime) {
      return NextResponse.json({
        error: 'Outside working hours',
        schedule: { dayOfWeek, startTime: scheduleEntry.startTime, endTime: scheduleEntry.endTime },
      }, { status: 409 });
    }
    // Check break time
    if (scheduleEntry.breakStart && scheduleEntry.breakEnd) {
      if (timeStr >= scheduleEntry.breakStart && timeStr < scheduleEntry.breakEnd) {
        return NextResponse.json({
          error: 'Conflicts with break time',
          schedule: { breakStart: scheduleEntry.breakStart, breakEnd: scheduleEntry.breakEnd },
        }, { status: 409 });
      }
    }
  }

  // Check time-off
  const timeOff = await prisma.timeOff.findFirst({
    where: {
      practitionerId,
      startDate: { lte: appointmentStart },
      endDate: { gte: appointmentStart },
    },
  });

  if (timeOff) {
    return NextResponse.json({
      error: 'Practitioner is off',
      timeOff: { startDate: timeOff.startDate, endDate: timeOff.endDate, reason: timeOff.reason },
    }, { status: 409 });
  }

  // Build list of dates to create (initial + recurring weeks)
  const weeks = recurring ? Math.min(Math.max(Number(recurringWeeks) || 0, 0), 52) : 0;
  const dates: Date[] = [appointmentStart];
  for (let w = 1; w <= weeks; w++) {
    dates.push(new Date(appointmentStart.getTime() + w * 7 * 24 * 60 * 60 * 1000));
  }

  const created: unknown[] = [];
  const skipped: { week: number; date: string; reason: string }[] = [];

  for (let i = 0; i < dates.length; i++) {
    const dt = dates[i];
    const dtEnd = new Date(dt.getTime() + Number(duration) * 60000);

    // For weeks > 0, run conflict checks on each occurrence
    if (i > 0) {
      const wDayOfWeek = dt.getDay();
      const wTimeStr = dt.toTimeString().slice(0, 5);

      // Double-booking check
      const wConflict = await prisma.appointment.findFirst({
        where: { practitionerId, status: { in: ['PENDING', 'CONFIRMED'] }, dateTime: { lt: dtEnd } },
      });
      if (wConflict) {
        const wEnd = new Date(wConflict.dateTime.getTime() + wConflict.duration * 60000);
        if (wEnd > dt) { skipped.push({ week: i, date: dt.toISOString(), reason: 'Scheduling conflict' }); continue; }
      }

      // Working hours check
      const wSched = await prisma.practitionerSchedule.findUnique({
        where: { practitionerId_dayOfWeek: { practitionerId, dayOfWeek: wDayOfWeek } },
      });
      if (wSched && (wTimeStr < wSched.startTime || wTimeStr >= wSched.endTime)) {
        skipped.push({ week: i, date: dt.toISOString(), reason: 'Outside working hours' }); continue;
      }
      if (wSched?.breakStart && wSched?.breakEnd && wTimeStr >= wSched.breakStart && wTimeStr < wSched.breakEnd) {
        skipped.push({ week: i, date: dt.toISOString(), reason: 'Break time' }); continue;
      }

      // Time-off check
      const wTimeOff = await prisma.timeOff.findFirst({
        where: { practitionerId, startDate: { lte: dt }, endDate: { gte: dt } },
      });
      if (wTimeOff) { skipped.push({ week: i, date: dt.toISOString(), reason: 'Practitioner is off' }); continue; }
    }

    const apt = await prisma.appointment.create({
      data: {
        practiceId,
        practitionerId,
        patientId,
        dateTime: dt,
        duration: Number(duration),
        type,
        notes,
        status: 'PENDING',
        recurring: recurring && weeks > 0,
        recurringDay: recurring && weeks > 0 ? appointmentStart.getDay() : null,
        recurringTime: recurring && weeks > 0 ? appointmentStart.toTimeString().slice(0, 5) : null,
      },
      include: {
        practitioner: { select: { id: true, name: true, handle: true } },
        patient: { select: { id: true, name: true, handle: true } },
      },
    });
    created.push(apt);
  }

  // Send relay notification for the first appointment
  let relayStatus: string | undefined;
  if (patient.handle && created.length > 0) {
    try {
      const first = created[0] as { id: string; practitioner: { handle: string } };
      const relayResult = await relaySend({
        recipientHandle: patient.handle,
        content: recurring && weeks > 0
          ? `Recurring appointment request (${created.length} sessions) from ${practitioner.name} starting ${new Date(dateTime).toLocaleString()}`
          : `Appointment request from ${practitioner.name} on ${new Date(dateTime).toLocaleString()}`,
        widgetSlug: 'scheduling',
        scope: 'appointment:create',
        metadata: {
          type: recurring ? 'recurring_appointment_request' : 'appointment_request',
          appointmentId: first.id,
          practitionerHandle: practitioner.handle,
          dateTime,
          duration,
          totalSessions: created.length,
        },
      });
      await prisma.appointment.update({
        where: { id: first.id },
        data: { relayMessageId: relayResult.id },
      });
      relayStatus = 'sent';
    } catch {
      relayStatus = 'failed';
    }
  }

  // Single appointment: return flat object. Recurring: return array + skipped info.
  if (!recurring || weeks === 0) {
    return NextResponse.json({ ...(created[0] as object), relayStatus }, { status: 201 });
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    appointments: created,
    skippedDetails: skipped.length > 0 ? skipped : undefined,
    relayStatus,
  }, { status: 201 });
}