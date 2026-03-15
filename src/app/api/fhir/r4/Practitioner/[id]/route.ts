import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { practitionerToFhir } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Practitioner/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practitioner = await prisma.practitioner.findUnique({ where: { id } });

  if (!practitioner) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Practitioner/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  return NextResponse.json(practitionerToFhir(practitioner), { headers: FHIR_JSON });
}
