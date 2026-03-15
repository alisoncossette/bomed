import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { normalizeHandle, notFound } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// GET /api/practices/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({
    where: { id },
    include: {
      practitioners: { where: { isActive: true }, orderBy: { name: 'asc' } },
      patients: { orderBy: { name: 'asc' } },
      _count: { select: { appointments: true } },
    },
  });
  if (!practice) return notFound('Practice');
  return NextResponse.json(practice);
}

// PATCH /api/practices/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.practice.findUnique({ where: { id } });
  if (!existing) return notFound('Practice');

  if (body.handle) body.handle = normalizeHandle(body.handle);

  const practice = await prisma.practice.update({ where: { id }, data: body });
  return NextResponse.json(practice);
}