import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientToFhir, fhirToPatientData, toBundle } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Patient — Search patients
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const name = req.nextUrl.searchParams.get('name');
  const identifier = req.nextUrl.searchParams.get('identifier');
  const email = req.nextUrl.searchParams.get('email');

  const where: Record<string, unknown> = {};
  if (name) where.name = { contains: name };
  if (email) where.email = email;
  if (identifier) {
    // identifier format: system|value or just value (Bolo handle)
    const value = identifier.includes('|') ? identifier.split('|')[1] : identifier;
    where.handle = value.replace(/^@/, '');
  }

  const patients = await prisma.patient.findMany({ where, orderBy: { name: 'asc' }, take: 100 });
  const resources = patients.map((p) => patientToFhir(p, baseUrl));

  return NextResponse.json(toBundle(resources, baseUrl), { headers: FHIR_JSON });
}

// POST /api/fhir/r4/Patient — Create patient from FHIR resource
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const fhir = await req.json();

  if (fhir.resourceType !== 'Patient') {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Expected resourceType: Patient' }] },
      { status: 400, headers: FHIR_JSON },
    );
  }

  const data = fhirToPatientData(fhir);

  if (!data.name || !data.email) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'name and email are required' }] },
      { status: 400, headers: FHIR_JSON },
    );
  }

  // Get first practice as default
  const practice = await prisma.practice.findFirst();
  if (!practice) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'No practice configured' }] },
      { status: 400, headers: FHIR_JSON },
    );
  }

  const patient = await prisma.patient.create({
    data: { ...data, practiceId: practice.id } as Parameters<typeof prisma.patient.create>[0]['data'],
  });

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json(patientToFhir(patient, baseUrl), {
    status: 201,
    headers: { ...FHIR_JSON, Location: `/api/fhir/r4/Patient/${patient.id}` },
  });
}