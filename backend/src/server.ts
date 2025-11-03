import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import DeepSeekService from './services/deepseek';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => { res.send('AiTravelPlanner API'); });

const PlanInput = z.object({
  destination: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  partySize: z.number().int().min(1),
  preferences: z.array(z.string()).default([]),
  currency: z.string().default('CNY'),
});

app.post('/api/plan', async (req, res) => {
  const parse = PlanInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const input = parse.data;
  
  try {
    // 尝试使用 DeepSeek AI 生成行程
    const deepSeekService = new DeepSeekService();
    const plan = await deepSeekService.generateTravelPlan(input);
    res.json(plan);
  } catch (error) {
    console.error('DeepSeek 服务初始化失败，使用备用方案:', error);
    
    // 如果 DeepSeek 服务不可用，使用原有的静态逻辑作为备用
    const days = 3;
    const itinerary = Array.from({ length: days }, (_, i) => ({
      date: input.startDate || `第${i + 1}天`,
      activities: [
        { time: '09:00', name: `${input.destination} 经典景点`, type: 'sightseeing' },
        { time: '12:00', name: '特色餐馆', type: 'food' },
        { time: '15:00', name: '自由活动', type: 'free' },
      ],
    }));
    const base = input.budget ?? 1000;
    const total = Math.round(base * (1 + (input.partySize - 1) * 0.6));
    const resp = {
      destination: input.destination,
      startDate: input.startDate || '',
      endDate: input.endDate || '',
      partySize: input.partySize,
      preferences: input.preferences,
      currency: input.currency,
      itinerary,
      budget: {
        totalEstimate: total,
        transportation: Math.round(total * 0.3),
        accommodation: Math.round(total * 0.3),
        food: Math.round(total * 0.25),
        attractions: Math.round(total * 0.15),
      },
    };
    res.json(resp);
  }
});

const Expense = z.object({ id: z.string().optional(), description: z.string(), category: z.string(), amount: z.number().nonnegative(), date: z.string() });
const BudgetAnalyzeInput = z.object({ expenses: z.array(Expense), budgetCap: z.number().optional(), currency: z.string().default('CNY') });

app.post('/api/budget/analyze', (req, res) => {
  const parse = BudgetAnalyzeInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { expenses, budgetCap, currency } = parse.data;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const categories = new Map<string, number>();
  expenses.forEach((e) => { categories.set(e.category, (categories.get(e.category) || 0) + e.amount); });
  const breakdown = Array.from(categories.entries()).map(([category, amount]) => ({ category, amount }));
  const suggestions: string[] = [];
  if (budgetCap != null) {
    const remaining = budgetCap - totalSpent;
    if (remaining < 0) suggestions.push('已超出预算，请缩减非必要消费。');
    else if (remaining < budgetCap * 0.1) suggestions.push('接近预算上限，建议降低购物或娱乐支出。');
    else suggestions.push('预算充足，可适当增加体验项目。');
    return res.json({ currency, totalSpent, budgetCap, remaining, breakdown, suggestions });
  }
  suggestions.push('设置预算上限可以获得更精确的建议。');
  res.json({ currency, totalSpent, breakdown, suggestions });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));