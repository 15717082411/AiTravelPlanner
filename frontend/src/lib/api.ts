import type { PlanInput, PlanResponse } from '../types/plan';
import type { Expense, BudgetAnalysis } from '../types/budget';

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

export async function postBudgetAnalyze(expenses: Expense[], budgetCap?: number): Promise<BudgetAnalysis> {
  const res = await fetch(`${base}/api/budget/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenses, budgetCap }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`请求失败: ${res.status} ${text}`);
  }
  return res.json();
}