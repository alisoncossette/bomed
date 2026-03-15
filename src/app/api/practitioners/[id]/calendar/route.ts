import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/practitioners/:id/calendar?date=2026-03-10&days=7
// Returns appointments + available slots for a date range
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const dateStr = sp.get('date') || new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(Number(sp.get('days') || 7), 1), 31);
  const slotDuration = Math.min(Math.max(Number(sp.get('slotDuration') || 30), 15), 120);

  const practitioner = await prisma.practitioner.findUnique({ where: { id } });
  if (!practitioner) return notFound('Practitioner');

  const startDate = new Date(`${dateStr}T00:00:00`);
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

  // Fetch schedule, appointments, and time-off in parallel
  const [schedule, appointments, timeOffs] = await Promise.all([
    prisma.practitionerSchedule.findMany({ where: { practitionerId: id } }),
    prisma.appointment.findMany({
      where: {
        practitionerId: id,
        dateTime: { gte: startDate, lt: endDate },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { id: true, name: true, handle: true } },
      },
      orderBy: { dateTime: 'asc' },
    }),
    prisma.timeOff.findMany({
      where: {
        practitionerId: id,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    }),
  ]);

  // Build schedule lookup by dayOfWeek
  const scheduleMap = new Map<number, typeof schedule[0]>();
  for (const s of schedule) scheduleMap.set(s.dayOfWeek, s);

  // Build day-by-day calendar
  const calendar: {
    date: string;
    dayOfWeek: number;
    working: boolean;
    offReason?: string;
    hours?: { start: string; end: string; breakStart?: string; breakEnd?: string };
    appointments: typeof appointments;
    availableSlots: string[];
  }[] = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dayStr = day.toISOString().slice(0, 10);
    const dow = day.getDay();

    const sched = scheduleMap.get(dow);
    const dayAppts = appointments.filter((a) => a.dateTime.toISOString().slice(0, 10) === dayStr);

    // Check time-off
    const off = timeOffs.find((t) => t.startDate <= day && t.endDate >= day);
    if (off) {
      calendar.push({ date: dayStr, dayOfWeek: dow, working: false, offReason: off.reason || 'Time off', appointments: dayAppts, availableSlots: [] });
      continue;
    }

    if (!sched) {
      calendar.push({ date: dayStr, dayOfWeek: dow, working: false, appointments: dayAppts, availableSlots: [] });
      continue;
    }

    // Generate available slots
    const slots: string[] = [];
    const [startH, startM] = sched.startTime.split(':').map(Number);
    const [endH, endM] = sched.endTime.split(':').map(Number);
    const breakStartMin = sched.breakStart ? Number(sched.breakStart.split(':')[0]) * 60 + Number(sched.breakStart.split(':')[1]) : null;
    const breakEndMin = sched.breakEnd ? Number(sched.breakEnd.split(':')[0]) * 60 + Number(sched.breakEnd.split(':')[1]) : null;

    let cursor = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (cursor + slotDuration <= endMin) {
      // Skip break
      if (breakStartMin !== null && breakEndMin !== null) {
        if (cursor >= breakStartMin && cursor < breakEndMin) {
          cursor = breakEndMin;
          continue;
        }
        // Slot would overlap break
        if (cursor < breakStartMin && cursor + slotDuration > breakStartMin) {
          cursor = breakEndMin;
          continue;
        }
      }

      const slotTime = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
      const slotStart = new Date(`${dayStr}T${slotTime}:00`);
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      // Check if any appointment overlaps this slot
      const booked = dayAppts.some((a) => {
        const aEnd = new Date(a.dateTime.getTime() + a.duration * 60000);
        return a.dateTime < slotEnd && aEnd > slotStart;
      });

      if (!booked) slots.push(slotTime);
      cursor += slotDuration;
    }

    calendar.push({
      date: dayStr,
      dayOfWeek: dow,
      working: true,
      hours: { start: sched.startTime, end: sched.endTime, breakStart: sched.breakStart || undefined, breakEnd: sched.breakEnd || undefined },
      appointments: dayAppts,
      availableSlots: slots,
    });
  }

  return NextResponse.json({
    practitioner: { id: practitioner.id, name: practitioner.name, handle: practitioner.handle },
    startDate: dateStr,
    days,
    slotDuration,
    calendar,
  });
}
