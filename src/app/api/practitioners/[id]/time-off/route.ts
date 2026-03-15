import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { required, badRequest, notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/practitioners/:id/time-off — List time-off blocks
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practitioner = await prisma.practitioner.findUnique({ where: { id } });
  if (!practitioner) return notFound('Practitioner');

  const sp = req.nextUrl.searchParams;
  const upcoming = sp.get('upcoming') === 'true';

  const where: Record<string, unknown> = { practitionerId: id };
  if (upcoming) where.endDate = { gte: new Date() };

  const timeOff = await prisma.timeOff.findMany({
    where,
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json({ practitionerId: id, timeOff });
}

// POST /api/practitioners/:id/time-off — Add time-off block
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const errors = required(body, ['startDate', 'endDate']);
  if (errors.length) return badRequest(errors);

  const practitioner = await prisma.practitioner.findUnique({ where: { id } });
  if (!practitioner) return notFound('Practitioner');

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);

  if (endDate <= startDate) {
    return NextResponse.json({ error: 'endDate must be after startDate' }, { status: 400 });
  }

  const timeOff = await prisma.timeOff.create({
    data: {
      practitionerId: id,
      startDate,
      endDate,
      reason: body.reason || null,
    },
  });

  return NextResponse.json(timeOff, { status: 201 });
}

// DELETE /api/practitioners/:id/time-off — Delete a time-off block
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const timeOffId = sp.get('timeOffId');

  if (!timeOffId) {
    return NextResponse.json({ error: 'timeOffId query param required' }, { status: 400 });
  }

  const timeOff = await prisma.timeOff.findUnique({ where: { id: timeOffId } });
  if (!timeOff || timeOff.practitionerId !== id) return notFound('Time off block');

  await prisma.timeOff.delete({ where: { id: timeOffId } });
  return NextResponse.json({ ok: true });
}
