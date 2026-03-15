import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { organizationToFhir, toBundle } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Organization — List practices as FHIR Organizations
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const practices = await prisma.practice.findMany({ orderBy: { name: 'asc' } });
  const resources = practices.map(organizationToFhir);

  return NextResponse.json(toBundle(resources, baseUrl), { headers: FHIR_JSON });
}
