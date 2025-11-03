import type { Expense } from '../types/budget';

const KEY = 'ai-travel-planner-expenses';

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Expense[]) : [];
    return arr;
  } catch {
    return [];
  }
}

export function saveExpenses(items: Expense[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addExpense(e: Omit<Expense, 'id'>) {
  const items = loadExpenses();
  const next = [{ id: crypto.randomUUID(), ...e }, ...items];
  saveExpenses(next);
  return next;
}

export function removeExpense(id: string) {
  const items = loadExpenses();
  const next = items.filter((i) => i.id !== id);
  saveExpenses(next);
  return next;
}