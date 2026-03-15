import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appointmentToFhir, fhirToAppointmentData, toBundle } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

const appointmentInclude = {
  patient: { select: { id: true, name: true } },
  practitioner: { select: { id: true, name: true } },
} as const;

// GET /api/fhir/r4/Appointment — Search appointments
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const status = req.nextUrl.searchParams.get('status');
  const date = req.nextUrl.searchParams.get('date');
  const patient = req.nextUrl.searchParams.get('patient');
  const practitioner = req.nextUrl.searchParams.get('practitioner');

  const where: Record<string, unknown> = {};

  if (status) {
    // Map FHIR status back to BoMed
    const fhirToBoMed: Record<string, string[]> = {
      proposed: ['PENDING'],
      booked: ['CONFIRMED'],
      cancelled: ['CANCELLED', 'DECLINED'],
      fulfilled: ['COMPLETED'],
    };
    const mapped = fhirToBoMed[status];
    if (mapped) where.status = { in: mapped };
  }

  if (date) {
    // FHIR date search: supports eq, ge, le prefixes
    const prefix = date.match(/^(eq|ge|le|gt|lt)/)?.[1] || 'eq';
    const dateValue = date.replace(/^(eq|ge|le|gt|lt)/, '');
    const d = new Date(dateValue);
    if (prefix === 'eq') {
      where.dateTime = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (prefix === 'ge') {
      where.dateTime = { gte: d };
    } else if (prefix === 'le') {
      where.dateTime = { lte: d };
    }
  }

  if (patient) {
    // Reference format: Patient/id or just id
    where.patientId = patient.replace('Patient/', '');
  }

  if (practitioner) {
    where.practitionerId = practitioner.replace('Practitioner/', '');
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { dateTime: 'asc' },
    take: 100,
  });

  const resources = appointments.map(appointmentToFhir);
  return NextResponse.json(toBundle(resources, baseUrl), { headers: FHIR_JSON });
}

// POST /api/fhir/r4/Appointment — Create appointment from FHIR resource
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const fhir = await req.json();

  if (fhir.resourceType !== 'Appointment') {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Expected resourceType: Appointment' }] },
      { status: 400, headers: FHIR_JSON },
    );
  }

  const data = fhirToAppointmentData(fhir);

  // Extract participant references
  let patientId: string | null = null;
  let practitionerId: string | null = null;

  for (const p of fhir.participant || []) {
    const ref = p.actor?.reference || '';
    if (ref.startsWith('Patient/')) patientId = ref.replace('Patient/', '');
    if (ref.startsWith('Practitioner/')) practitionerId = ref.replace('Practitioner/', '');
  }

  if (!patientId || !practitionerId || !data.dateTime) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'Patient participant, Practitioner participant, and start time are required' }] },
      { status: 400, headers: FHIR_JSON },
    );
  }

  // Get practiceId from practitioner
  const pract = await prisma.practitioner.findUnique({ where: { id: practitionerId } });
  if (!pract) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Practitioner/${practitionerId} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      practiceId: pract.practiceId,
      practitionerId,
      patientId,
      dateTime: data.dateTime as Date,
      duration: (data.duration as number) || 30,
      type: (data.type as string) || 'PT_SESSION',
      status: (data.status as string) || 'PENDING',
      notes: (data.notes as string) || null,
    },
    include: appointmentInclude,
  });

  return NextResponse.json(appointmentToFhir(appointment), {
    status: 201,
    headers: { ...FHIR_JSON, Location: `/api/fhir/r4/Appointment/${appointment.id}` },
  });
}
