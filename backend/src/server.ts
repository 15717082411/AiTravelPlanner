import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'AiTravelPlanner API' });
});

const PlanInput = z.object({
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().min(0).optional(),
  partySize: z.number().int().min(1).default(1),
  preferences: z.array(z.string()).optional(),
});

app.post('/api/plan', (req, res) => {
  const parsed = PlanInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { destination, startDate, endDate, budget, partySize, preferences } = parsed.data;
  const itinerary = [
    { day: 1, title: `${destination} 市区游`, activities: ['博物馆', '老城区步行', '本地餐馆'] },
    { day: 2, title: `${destination} 周边自然景观`, activities: ['国家公园徒步', '观景台拍照'] },
  ];
  const budgetEst = {
    currency: 'CNY',
    estimate: (budget ?? 2000) * partySize,
    breakdown: { accommodation: 800 * partySize, transport: 400 * partySize, food: 300 * partySize, activities: 500 * partySize },
  };
  res.json({ destination, startDate, endDate, partySize, preferences: preferences ?? [], itinerary, budget: budgetEst });
});

// 费用预算分析
const Expense = z.object({
  id: z.string().optional(),
  description: z.string(),
  category: z.string(),
  amount: z.number().min(0),
  date: z.string(),
});
const BudgetAnalyzeInput = z.object({
  expenses: z.array(Expense),
  budgetCap: z.number().min(0).optional(),
});

app.post('/api/budget/analyze', (req, res) => {
  const parsed = BudgetAnalyzeInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { expenses, budgetCap } = parsed.data;
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const breakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const remaining = budgetCap != null ? Math.max(0, budgetCap - totalSpent) : undefined;

  // 简单建议逻辑（占位，可替换为 LLM）
  const suggestions: string[] = [];
  if (budgetCap != null) {
    if (totalSpent > budgetCap) {
      const top = breakdown[0];
      if (top) suggestions.push(`当前超支 ${(totalSpent - budgetCap).toFixed(0)} 元，考虑减少「${top.category}」支出。`);
      suggestions.push('优先预订可退款项目、查看交通/住宿的优惠与组合票。');
    } else {
      suggestions.push(`剩余预算约 ${remaining?.toFixed(0)} 元，可增加体验或升级餐饮/住宿。`);
    }
  } else {
    suggestions.push('未设置预算上限，建议设定目标以便更好地控制开销。');
  }

  res.json({
    currency: 'CNY',
    totalSpent,
    budgetCap: budgetCap ?? null,
    remaining: remaining ?? null,
    breakdown,
    suggestions,
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});