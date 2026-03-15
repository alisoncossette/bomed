import { NextResponse } from 'next/server';
import { generateDocument } from '@/lib/openapi';

// GET /api/docs — OpenAPI 3.1 JSON spec
export async function GET() {
  return NextResponse.json(generateDocument());
}