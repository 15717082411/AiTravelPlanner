const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

import type { PlanInput, PlanResponse } from '../types/plan';
import type { ParsedPlan } from './parseSpeech';
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

export async function postParsePlanText(text: string): Promise<ParsedPlan> {
  const res = await fetch(`${API_BASE}/api/ai/parse-plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, currency: 'CNY' })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type ParsedExpense = {
  description?: string;
  amount?: number;
  category?: string;
  date?: string;
};

export async function postParseExpenseText(text: string): Promise<ParsedExpense> {
  const res = await fetch(`${API_BASE}/api/ai/parse-expense`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, currency: 'CNY' })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}