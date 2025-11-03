import type { Expense } from '../types/budget';

const KEY = 'ai-travel-budget-expenses';

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveExpenses(items: Expense[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addExpense(item: Omit<Expense, 'id'>): Expense[] {
  const items = loadExpenses();
  const exp: Expense = { id: crypto.randomUUID(), ...item };
  const next = [exp, ...items];
  saveExpenses(next);
  return next;
}

export function removeExpense(id: string): Expense[] {
  const items = loadExpenses().filter((e) => e.id !== id);
  saveExpenses(items);
  return items;
}