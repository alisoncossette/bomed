import { NextRequest, NextResponse } from 'next/server';
import { capabilityStatement } from '@/lib/fhir';

export async function GET(req: NextRequest) {
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json(capabilityStatement(baseUrl), {
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}