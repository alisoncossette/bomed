import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { required, normalizeHandle, badRequest, notFound } from '@/lib/validate';

// GET /api/practitioners
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const practiceId = sp.get('practiceId');
  const active = sp.get('active');
  const limit = Math.min(Number(sp.get('limit') || 100), 500);
  const offset = Number(sp.get('offset') || 0);

  const where: Record<string, unknown> = {};
  if (practiceId) where.practiceId = practiceId;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;

  const [practitioners, total] = await Promise.all([
    prisma.practitioner.findMany({
      where,
      include: { _count: { select: { appointments: true, patients: true } } },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.practitioner.count({ where }),
  ]);

  return NextResponse.json({ data: practitioners, total, limit, offset });
}

// POST /api/practitioners
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const errors = required(body, ['name', 'handle', 'email', 'practiceId']);
  if (errors.length) return badRequest(errors);

  const { name, email, specialty, practiceId } = body;
  const handle = normalizeHandle(body.handle)!;

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return notFound('Practice');

  const practitioner = await prisma.practitioner.create({
    data: { name, handle, email, specialty, practiceId },
  });
  return NextResponse.json(practitioner, { status: 201 });
}