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

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});