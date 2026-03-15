import { NextResponse } from 'next/server';

// Simple validation helpers — no dependencies

type ValidationError = { field: string; message: string };

export function required(body: Record<string, unknown>, fields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }
  return errors;
}

export function validEmail(value: unknown): boolean {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeHandle(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  return value.toLowerCase().replace(/^@/, '');
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'DECLINED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'];
const VALID_TYPES = ['PT_SESSION', 'EVALUATION', 'FOLLOW_UP'];

export function validStatus(value: unknown): boolean {
  return typeof value === 'string' && VALID_STATUSES.includes(value);
}

export function validAppointmentType(value: unknown): boolean {
  return typeof value === 'string' && VALID_TYPES.includes(value);
}

export function badRequest(errors: ValidationError[]): NextResponse {
  return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
}

export function notFound(entity = 'Resource'): NextResponse {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
}
