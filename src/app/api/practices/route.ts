import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { required, normalizeHandle, badRequest } from '@/lib/validate';

// GET /api/practices
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const practices = await prisma.practice.findMany({
    include: { _count: { select: { practitioners: true, patients: true, appointments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ data: practices });
}

// POST /api/practices
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const errors = required(body, ['name', 'handle', 'email']);
  if (errors.length) return badRequest(errors);

  const { name, email, phone, address, timezone = 'America/New_York' } = body;
  const handle = normalizeHandle(body.handle)!;

  const practice = await prisma.practice.create({
    data: { name, handle, email, phone, address, timezone },
  });
  return NextResponse.json(practice, { status: 201 });
}