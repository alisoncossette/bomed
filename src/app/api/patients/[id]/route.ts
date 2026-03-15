import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { normalizeHandle, notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/patients/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      practice: { select: { id: true, name: true, handle: true } },
      practitioners: { include: { practitioner: { select: { id: true, name: true, handle: true, specialty: true } } } },
      appointments: { orderBy: { dateTime: 'desc' }, take: 20, include: { practitioner: { select: { id: true, name: true } } } },
    },
  });
  if (!patient) return notFound('Patient');
  return NextResponse.json(patient);
}

// PATCH /api/patients/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) return notFound('Patient');

  const updateData: Record<string, unknown> = { ...body };
  if (body.handle !== undefined) updateData.handle = normalizeHandle(body.handle);
  if (body.dateOfBirth) updateData.dateOfBirth = new Date(body.dateOfBirth);
  if (body.insuranceEffDate) updateData.insuranceEffDate = new Date(body.insuranceEffDate);
  if (body.insuranceExpDate) updateData.insuranceExpDate = new Date(body.insuranceExpDate);
  // Don't allow changing practiceId via PATCH
  delete updateData.practiceId;

  const patient = await prisma.patient.update({ where: { id }, data: updateData });
  return NextResponse.json(patient);
}