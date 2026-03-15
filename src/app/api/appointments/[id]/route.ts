import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { validStatus, validAppointmentType, notFound } from '@/lib/validate';
import { relayReply } from '@/lib/bolo';
import { isPccConfigured, syncAppointmentToPcc, updatePccAppointment } from '@/lib/pcc';

type Params = { params: Promise<{ id: string }> };

// GET /api/appointments/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      practitioner: { select: { id: true, name: true, handle: true, specialty: true } },
      patient: { select: { id: true, name: true, handle: true, email: true } },
      practice: { select: { id: true, name: true } },
    },
  });

  if (!appointment) return notFound('Appointment');
  return NextResponse.json(appointment);
}

// PATCH /api/appointments/:id — Update appointment (including confirm/decline)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  if (body.status && !validStatus(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (body.type && !validAppointmentType(body.type)) {
    return NextResponse.json({ error: 'Invalid appointment type' }, { status: 400 });
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return notFound('Appointment');

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.dateTime) updateData.dateTime = new Date(body.dateTime);
  if (body.duration) updateData.duration = Number(body.duration);
  if (body.type) updateData.type = body.type;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      practitioner: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true, email: true } },
    },
  });

  // If status changed to CONFIRMED/DECLINED and there's a relay message, reply
  let relayStatus: string | undefined;
  if (body.status && ['CONFIRMED', 'DECLINED'].includes(body.status) && existing.relayMessageId) {
    try {
      await relayReply(existing.relayMessageId, JSON.stringify({
        type: body.status === 'CONFIRMED' ? 'appointment_confirmed' : 'appointment_declined',
        appointmentId: id,
      }));
      relayStatus = 'replied';
    } catch {
      relayStatus = 'reply_failed';
    }
  }

  // Sync status changes to PCC if configured
  let pccStatus: string | undefined;
  if (body.status && isPccConfigured()) {
    if (body.status === 'CONFIRMED' && !existing.pccSyncedAt) {
      // First-time sync to PCC on confirm
      const result = await syncAppointmentToPcc({
        dateTime: appointment.dateTime,
        duration: appointment.duration,
        status: appointment.status,
        type: appointment.type,
        notes: appointment.notes,
        patient: appointment.patient,
        practitioner: appointment.practitioner,
      });
      if (result.success) {
        await prisma.appointment.update({
          where: { id },
          data: { pccResourceId: result.pccResourceId, pccSyncedAt: new Date(), pccSyncError: null },
        });
        pccStatus = 'synced';
      } else {
        await prisma.appointment.update({ where: { id }, data: { pccSyncError: result.error } });
        pccStatus = 'sync_failed';
      }
    } else if (['CANCELLED', 'DECLINED', 'COMPLETED'].includes(body.status) && existing.pccResourceId) {
      // Update existing PCC appointment status
      const result = await updatePccAppointment(existing.pccResourceId, { status: body.status });
      pccStatus = result.success ? 'updated' : 'update_failed';
    }
  }

  return NextResponse.json({ ...appointment, relayStatus, pccStatus });
}

// DELETE /api/appointments/:id — Cancel appointment (soft delete)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return notFound('Appointment');

  await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  return NextResponse.json({ ok: true, status: 'CANCELLED' });
}