import type { PlanInput, PlanResponse } from '../types/plan';

const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export async function postPlan(input: PlanInput): Promise<PlanResponse> {
  const res = await fetch(`${base}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`请求失败: ${res.status} ${text}`);
  }
  return res.json();
}