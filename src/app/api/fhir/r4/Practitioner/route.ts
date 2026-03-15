import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { practitionerToFhir, toBundle } from '@/lib/fhir';
import { requireAuth } from '@/lib/auth';

const FHIR_JSON = { 'Content-Type': 'application/fhir+json' };

// GET /api/fhir/r4/Practitioner — Search practitioners
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const name = req.nextUrl.searchParams.get('name');
  const active = req.nextUrl.searchParams.get('active');
  const identifier = req.nextUrl.searchParams.get('identifier');

  const where: Record<string, unknown> = {};
  if (name) where.name = { contains: name };
  if (active !== null) where.isActive = active === 'true';
  if (identifier) {
    const value = identifier.includes('|') ? identifier.split('|')[1] : identifier;
    where.handle = value.replace(/^@/, '');
  }

  const practitioners = await prisma.practitioner.findMany({ where, orderBy: { name: 'asc' }, take: 100 });
  const resources = practitioners.map(practitionerToFhir);

  return NextResponse.json(toBundle(resources, baseUrl), { headers: FHIR_JSON });
}
