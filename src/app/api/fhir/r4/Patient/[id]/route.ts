import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientToFhir, fhirToPatientData } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Patient/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });

  if (!patient) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Patient/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json(patientToFhir(patient, baseUrl), { headers: FHIR_JSON });
}

// PUT /api/fhir/r4/Patient/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const fhir = await req.json();

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Patient/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  const data = fhirToPatientData(fhir);
  const updated = await prisma.patient.update({ where: { id }, data });

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json(patientToFhir(updated, baseUrl), { headers: FHIR_JSON });
}