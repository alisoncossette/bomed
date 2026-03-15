import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { organizationToFhir } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Organization/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const practice = await prisma.practice.findUnique({ where: { id } });

  if (!practice) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Organization/${id} not found` }] },
      { status: 404, headers: FHIR_JSON },
    );
  }

  return NextResponse.json(organizationToFhir(practice), { headers: FHIR_JSON });
}
