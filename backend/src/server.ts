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
  preferences: z.array(z.string()).optional(),
});

app.post('/api/plan', (req, res) => {
  const parsed = PlanInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { destination, startDate, endDate, budget } = parsed.data;
  // TODO: 调用所选的大语言模型 API，生成行程与预算估计。
  // 当前返回占位数据，便于前后端联调。
  const itinerary = [
    { day: 1, title: `${destination} 市区游`, activities: ['博物馆', '老城区步行', '本地餐馆'] },
    { day: 2, title: `${destination} 周边自然景观`, activities: ['国家公园徒步', '观景台拍照'] },
  ];
  const budgetEst = {
    currency: 'CNY',
    estimate: budget ?? 2000,
    breakdown: { accommodation: 800, transport: 400, food: 300, activities: 500 },
  };
  res.json({ destination, startDate, endDate, itinerary, budget: budgetEst });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});