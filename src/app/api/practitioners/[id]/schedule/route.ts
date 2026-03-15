import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/practitioners/:id/schedule — Get weekly working hours
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practitioner = await prisma.practitioner.findUnique({ where: { id } });
  if (!practitioner) return notFound('Practitioner');

  const schedule = await prisma.practitionerSchedule.findMany({
    where: { practitionerId: id },
    orderBy: { dayOfWeek: 'asc' },
  });

  return NextResponse.json({ practitionerId: id, schedule });
}

// PUT /api/practitioners/:id/schedule — Set weekly working hours (replaces all)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practitioner = await prisma.practitioner.findUnique({ where: { id } });
  if (!practitioner) return notFound('Practitioner');

  const body = await req.json();
  const { schedule } = body;

  if (!Array.isArray(schedule)) {
    return NextResponse.json({ error: 'schedule must be an array' }, { status: 400 });
  }

  // Validate each entry
  for (const entry of schedule) {
    if (typeof entry.dayOfWeek !== 'number' || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
      return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 });
    }
    if (!entry.startTime || !entry.endTime) {
      return NextResponse.json({ error: 'startTime and endTime are required' }, { status: 400 });
    }
  }

  // Delete existing and create new
  await prisma.practitionerSchedule.deleteMany({ where: { practitionerId: id } });

  const created = [];
  for (const entry of schedule) {
    const row = await prisma.practitionerSchedule.create({
      data: {
        practitionerId: id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakStart: entry.breakStart || null,
        breakEnd: entry.breakEnd || null,
      },
    });
    created.push(row);
  }

  return NextResponse.json({ practitionerId: id, schedule: created });
}
