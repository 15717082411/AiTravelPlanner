const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export type KeysPayload = {
  deepseekApiKey?: string;
  iflytekAppId?: string;
  iflytekApiKey?: string;
  iflytekApiSecret?: string;
};

function buildHeaders(adminToken?: string): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminToken) h['x-admin-token'] = adminToken;
  return h;
}

export async function getMaskedKeys(adminToken?: string): Promise<KeysPayload> {
  const res = await fetch(`${API_BASE}/api/admin/keys`, {
    method: 'GET',
    headers: buildHeaders(adminToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateKeys(payload: KeysPayload, adminToken?: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/admin/keys`, {
    method: 'POST',
    headers: buildHeaders(adminToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getIflytekSign(adminToken?: string, host?: string): Promise<{
  host: string;
  appId: string;
  date: string;
  authorization: string;
}> {
  const qs = new URLSearchParams();
  if (host) qs.set('host', host);
  const res = await fetch(`${API_BASE}/api/speech/iflytek/sign?${qs.toString()}`, {
    method: 'GET',
    headers: buildHeaders(adminToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function testDeepseek(adminToken?: string): Promise<{
  ok: boolean;
  models?: string[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/admin/test/deepseek`, {
    method: 'GET',
    headers: buildHeaders(adminToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function testIflytek(host?: string, adminToken?: string): Promise<{
  ok: boolean;
  host?: string;
  message?: string;
  error?: string;
}> {
  const qs = new URLSearchParams();
  if (host) qs.set('host', host);
  const res = await fetch(`${API_BASE}/api/admin/test/iflytek?${qs.toString()}`, {
    method: 'GET',
    headers: buildHeaders(adminToken),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


