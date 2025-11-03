const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

import type { PlanInput, PlanResponse } from '../types/plan';
import type { Expense, BudgetAnalysis } from '../types/budget';

export async function postPlan(input: PlanInput): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/api/plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postBudgetAnalyze(expenses: Expense[], budgetCap?: number): Promise<BudgetAnalysis> {
  const body = { expenses, budgetCap, currency: 'CNY' };
  const res = await fetch(`${API_BASE}/api/budget/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}