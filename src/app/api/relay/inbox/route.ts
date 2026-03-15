import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { relayInbox } from '@/lib/bolo';

// GET /api/relay/inbox — Poll Bolo relay inbox for incoming messages
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const since = req.nextUrl.searchParams.get('since') || undefined;

  try {
    const result = await relayInbox(since);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
