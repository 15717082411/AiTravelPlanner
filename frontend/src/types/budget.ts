export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
};

export type BudgetAnalysis = {
  currency: string;
  totalSpent: number;
  budgetCap?: number;
  remaining?: number;
  breakdown: Array<{ category: string; amount: number }>;
  suggestions: string[];
};