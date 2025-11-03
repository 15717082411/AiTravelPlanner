import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import DeepSeekService from './services/deepseek';
import { buildIFlytekAuth } from './utils/iflytek';
import { maskedKeys, updateKeys } from './config/keys';
import { adminGuard } from './middleware/admin';
import OpenAI from 'openai';
import { getKeys } from './config/keys';
import WebSocket from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => { res.send('AiTravelPlanner API'); });

// 科大讯飞 WebSocket 授权签名
app.get('/api/speech/iflytek/sign', (req, res) => {
  try {
    const host = typeof req.query.host === 'string' ? req.query.host : undefined;
    const auth = buildIFlytekAuth(host);
    res.json(auth);
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// 管理：诊断讯飞 WebSocket 握手（捕获 401/403 等错误）
app.get('/api/admin/test/iflytek', adminGuard, async (req, res) => {
  try {
    const host = typeof req.query.host === 'string' ? req.query.host : undefined;
    const sign = buildIFlytekAuth(host);
    const qs = new URLSearchParams({ authorization: sign.authorization, date: sign.date, host: sign.host });
    const url = `wss://${sign.host}/v2/iat?${qs.toString()}`;

    const ws = new WebSocket(url, { handshakeTimeout: 8000 });

    const result = await new Promise<{ ok: boolean; message?: string }>((resolve) => {
      let settled = false;
      ws.once('open', () => {
        if (settled) return; settled = true;
        ws.close();
        resolve({ ok: true });
      });
      ws.once('error', (err: any) => {
        if (settled) return; settled = true;
        resolve({ ok: false, message: err?.message || String(err) });
      });
    });

    if (result.ok) {
      return res.json({ ok: true, host: sign.host, message: 'Handshake success' });
    }
    return res.status(502).json({ ok: false, host: sign.host, error: result.message });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// 管理：查看与更新密钥（简化实现，未加认证，建议上线前加鉴权）
app.get('/api/admin/keys', adminGuard, (_req, res) => {
  try {
    res.json(maskedKeys());
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

const KeysUpdateSchema = z.object({
  deepseekApiKey: z.string().optional(),
  iflytekAppId: z.string().optional(),
  iflytekApiKey: z.string().optional(),
  iflytekApiSecret: z.string().optional(),
});
app.post('/api/admin/keys', adminGuard, (req, res) => {
  const parse = KeysUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  updateKeys(parse.data);
  res.json({ ok: true });
});

// 测试 DeepSeek 密钥是否有效（尝试列出模型）
app.get('/api/admin/test/deepseek', adminGuard, async (_req, res) => {
  try {
    const { deepseekApiKey } = getKeys();
    if (!deepseekApiKey) {
      return res.status(400).json({ ok: false, error: '缺少 DEEPSEEK_API_KEY' });
    }
    const client = new OpenAI({ apiKey: deepseekApiKey, baseURL: 'https://api.deepseek.com/v1' });
    const models = await client.models.list();
    const ids = (models.data || []).map(m => m.id).slice(0, 5);
    res.json({ ok: true, models: ids });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

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

// AI 解析自由文本为规划字段（智能填充）
const ParseTextSchema = z.object({ text: z.string().min(1), currency: z.string().default('CNY') });
app.post('/api/ai/parse-plan', async (req, res) => {
  const parse = ParseTextSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { text, currency } = parse.data;
  try {
    const svc = new DeepSeekService();
    const r = await svc.extractPlanFields(text, currency);
    // 映射为前端智能填充使用的结构
    const budget = r.budget?.total ?? (r.budget?.perPerson != null && r.partySize != null ? Math.round((r.budget!.perPerson!) * r.partySize) : undefined);
    return res.json({
      destination: r.destination,
      startDate: r.startDate,
      endDate: r.endDate,
      budget,
      preferences: r.preferences,
      partySize: r.partySize,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// AI 解析自由文本为预算开销字段（预算页智能填充）
app.post('/api/ai/parse-expense', async (req, res) => {
  const parse = ParseTextSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { text, currency } = parse.data;
  try {
    const svc = new DeepSeekService();
    const r = await svc.extractExpenseFields(text, currency);
    return res.json({
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: r.date,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
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