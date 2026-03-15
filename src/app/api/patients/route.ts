import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { required, normalizeHandle, notFound, badRequest } from '@/lib/validate';

// GET /api/patients
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const practiceId = sp.get('practiceId');
  const limit = Math.min(Number(sp.get('limit') || 100), 500);
  const offset = Number(sp.get('offset') || 0);

  const where = practiceId ? { practiceId } : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        _count: { select: { appointments: true } },
        practitioners: { include: { practitioner: { select: { id: true, name: true, handle: true } } } },
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({ data: patients, total, limit, offset });
}

// POST /api/patients
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const errors = required(body, ['name', 'email', 'practiceId']);
  if (errors.length) return badRequest(errors);

  const { name, email, phone, practiceId, practitionerId, handle,
    dateOfBirth, address, city, state, zip,
    emergencyName, emergencyPhone, emergencyRelation,
    insuranceCarrier, insurancePlan, insuranceGroupNo, insuranceMemberId,
    insuranceEffDate, insuranceExpDate } = body;

  // Verify practice exists
  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return notFound('Practice');

  // Verify practitioner belongs to practice if specified
  if (practitionerId) {
    const practitioner = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
    if (!practitioner || practitioner.practiceId !== practiceId) return notFound('Practitioner in this practice');
  }

  const patient = await prisma.patient.create({
    data: {
      name, email, phone, practiceId,
      handle: normalizeHandle(handle),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      address, city, state, zip,
      emergencyName, emergencyPhone, emergencyRelation,
      insuranceCarrier, insurancePlan, insuranceGroupNo, insuranceMemberId,
      ...(insuranceEffDate && { insuranceEffDate: new Date(insuranceEffDate) }),
      ...(insuranceExpDate && { insuranceExpDate: new Date(insuranceExpDate) }),
    },
  });

  if (practitionerId) {
    await prisma.patientPractitioner.create({
      data: { patientId: patient.id, practitionerId, isPrimary: true },
    });
  }

  return NextResponse.json(patient, { status: 201 });
}