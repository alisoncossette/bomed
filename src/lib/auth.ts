import { NextRequest, NextResponse } from 'next/server';

const BOMED_API_KEY = process.env.BOMED_API_KEY;

export type AuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function requireAuth(req: NextRequest): AuthResult {
  // No key configured = dev mode, allow all
  if (!BOMED_API_KEY) return { ok: true };

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 }),
    };
  }

  const token = header.slice(7);
  if (token !== BOMED_API_KEY) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid API key' }, { status: 403 }),
    };
  }

  return { ok: true };
}
