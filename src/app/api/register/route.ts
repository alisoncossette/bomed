import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { registerWidget } from '@/lib/bolo';

// POST /api/register — Register BoMed as a Bolo widget
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await registerWidget({
      slug: 'scheduling',
      name: 'BoMed Scheduling',
      description: 'Privacy-first scheduling for PT & athletic training',
      scopes: [
        'availability:query',
        'appointment:create',
        'appointment:manage',
        'demographics:read',
        'insurance:read',
      ],
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
