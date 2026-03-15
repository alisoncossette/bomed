// Bolo API client for BoMed
// Matches the actual Bolo relay + widget registration endpoints

const API_BASE = process.env.BOLO_API_URL || 'https://bolo-api-650440848480.us-central1.run.app';
const API_KEY = process.env.BOLO_API_KEY || '';

async function request<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | undefined> } = {},
): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_BASE}/api${endpoint}`;
  if (params) {
    const filtered = Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    if (filtered.length > 0) {
      url += `?${new URLSearchParams(filtered).toString()}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    let message: string;
    try {
      const parsed = JSON.parse(err);
      message = parsed.message || parsed.error || err;
    } catch {
      message = err;
    }
    throw new Error(`Bolo API (${res.status}): ${message}`);
  }

  return res.json();
}

// ─── Widget Registration ────────────────────────────────────────────

export async function registerWidget(input: {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  scopes: string[];
}) {
  return request('/widgets/register', { method: 'POST', body: input });
}

// ─── Relay ──────────────────────────────────────────────────────────

export async function relaySend(input: {
  recipientHandle: string;
  content: string;
  widgetSlug?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
}) {
  return request<{ id: string; status: string; expiresAt: string }>(
    '/relay/send',
    { method: 'POST', body: input },
  );
}

export async function relayInbox(since?: string) {
  return request<{ messages: RelayMessage[]; count: number }>(
    '/relay/inbox',
    { params: { since } },
  );
}

export async function relayReply(messageId: string, content: string, metadata?: Record<string, unknown>) {
  return request<{ id: string; parentMessageId: string }>(
    `/relay/${messageId}/reply`,
    { method: 'POST', body: { content, metadata } },
  );
}

export async function relayResponses(since?: string) {
  return request<{ messages: RelayMessage[]; count: number }>(
    '/relay/responses',
    { params: { since } },
  );
}

export async function relayAck(messageIds: string[]) {
  return request<{ acknowledged: number }>(
    '/relay/ack',
    { method: 'POST', body: { messageIds } },
  );
}

// ─── Access ─────────────────────────────────────────────────────────

export async function checkAccess(handle: string) {
  const clean = handle.replace(/^@/, '').toLowerCase();
  return request(`/@${clean}/access/key`);
}

export async function lookupHandle(handle: string) {
  const clean = handle.replace(/^@/, '').toLowerCase();
  try {
    const user = await request<{ handle: string; name: string | null; id: string }>(
      `/users/handle/${clean}`,
    );
    return { exists: true, handle: user.handle, name: user.name };
  } catch {
    return { exists: false, handle: clean, name: null };
  }
}

// ─── Types ──────────────────────────────────────────────────────────

export interface RelayMessage {
  id: string;
  senderHandle: string;
  recipientHandle?: string;
  parentMessageId?: string;
  widgetSlug: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  conversationId: string | null;
  createdAt: string;
  expiresAt?: string;
}
