import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/practitioners/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practitioner = await prisma.practitioner.findUnique({
    where: { id },
    include: {
      practice: { select: { id: true, name: true, handle: true } },
      patients: { include: { patient: { select: { id: true, name: true, handle: true } } } },
      _count: { select: { appointments: true } },
    },
  });
  if (!practitioner) return notFound('Practitioner');
  return NextResponse.json(practitioner);
}

// PATCH /api/practitioners/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.practitioner.findUnique({ where: { id } });
  if (!existing) return notFound('Practitioner');

  const practitioner = await prisma.practitioner.update({ where: { id }, data: body });
  return NextResponse.json(practitioner);
}

// DELETE /api/practitioners/:id — Soft delete (deactivate)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.practitioner.findUnique({ where: { id } });
  if (!existing) return notFound('Practitioner');

  await prisma.practitioner.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true, deactivated: true });
}