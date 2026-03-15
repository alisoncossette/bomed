import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appointmentToFhir, fhirToAppointmentData } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

const appointmentInclude = {
  patient: { select: { id: true, name: true } },
  practitioner: { select: { id: true, name: true } },
} as const;

// GET /api/fhir/r4/Appointment/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });

  if (!appointment) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Appointment/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  return NextResponse.json(appointmentToFhir(appointment), { headers: FHIR_JSON });
}

// PUT /api/fhir/r4/Appointment/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const fhir = await req.json();

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Appointment/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  const data = fhirToAppointmentData(fhir);
  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: appointmentInclude,
  });

  return NextResponse.json(appointmentToFhir(updated), { headers: FHIR_JSON });
}
