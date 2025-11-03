export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string; // ISO
};

export type BudgetAnalysis = {
  currency: string;
  totalSpent: number;
  budgetCap: number | null;
  remaining: number | null;
  breakdown: { category: string; amount: number }[];
  suggestions: string[];
};