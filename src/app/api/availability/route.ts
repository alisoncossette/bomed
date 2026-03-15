import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { required, badRequest } from '@/lib/validate';
import { relaySend } from '@/lib/bolo';

// POST /api/availability — Check patient availability via Bolo relay
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const errors = required(body, ['patientHandle', 'dateTime']);
  if (errors.length) return badRequest(errors);

  const { patientHandle, dateTime } = body;

  try {
    const result = await relaySend({
      recipientHandle: patientHandle,
      content: `Availability check for ${new Date(dateTime).toLocaleString()}`,
      widgetSlug: 'scheduling',
      scope: 'availability:query',
      metadata: { type: 'availability_check', dateTime },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}