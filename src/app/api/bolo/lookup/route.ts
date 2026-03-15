import { NextRequest, NextResponse } from 'next/server';
import { lookupHandle } from '@/lib/bolo';

// GET /api/bolo/lookup?handle=alice
// Looks up a Bolo handle and returns public profile data
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle');
  if (!handle) {
    return NextResponse.json({ error: 'handle is required' }, { status: 400 });
  }

  try {
    const result = await lookupHandle(handle);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
