"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const deepseek_1 = __importDefault(require("./services/deepseek"));
const iflytek_1 = require("./utils/iflytek");
const keys_1 = require("./config/keys");
const admin_1 = require("./middleware/admin");
const openai_1 = __importDefault(require("openai"));
const keys_2 = require("./config/keys");
const ws_1 = __importDefault(require("ws"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 在 Docker 环境中提供静态文件服务
const isDocker = process.env.DOCKER === 'true' || process.env.NODE_ENV === 'production';
if (isDocker) {
    const publicPath = path_1.default.join(__dirname, '../../public');
    app.use(express_1.default.static(publicPath));
    // API 路由应该在静态文件之前定义，所以这里只处理非 API 路由
    app.get('/', (_req, res) => {
        res.sendFile(path_1.default.join(publicPath, 'index.html'));
    });
}
else {
    app.get('/', (_req, res) => { res.send('AiTravelPlanner API'); });
}
// 科大讯飞 WebSocket 授权签名
app.get('/api/speech/iflytek/sign', (req, res) => {
    try {
        const host = typeof req.query.host === 'string' ? req.query.host : undefined;
        const auth = (0, iflytek_1.buildIFlytekAuth)(host);
        res.json(auth);
    }
    catch (e) {
        res.status(500).json({ error: e.message || String(e) });
    }
});
// 管理：诊断讯飞 WebSocket 握手（捕获 401/403 等错误）
app.get('/api/admin/test/iflytek', admin_1.adminGuard, async (req, res) => {
    try {
        const host = typeof req.query.host === 'string' ? req.query.host : undefined;
        const sign = (0, iflytek_1.buildIFlytekAuth)(host);
        const qs = new URLSearchParams({ authorization: sign.authorization, date: sign.date, host: sign.host });
        const url = `wss://${sign.host}/v2/iat?${qs.toString()}`;
        const ws = new ws_1.default(url, { handshakeTimeout: 8000 });
        const result = await new Promise((resolve) => {
            let settled = false;
            ws.once('open', () => {
                if (settled)
                    return;
                settled = true;
                ws.close();
                resolve({ ok: true });
            });
            ws.once('error', (err) => {
                if (settled)
                    return;
                settled = true;
                resolve({ ok: false, message: err?.message || String(err) });
            });
        });
        if (result.ok) {
            return res.json({ ok: true, host: sign.host, message: 'Handshake success' });
        }
        return res.status(502).json({ ok: false, host: sign.host, error: result.message });
    }
    catch (e) {
        return res.status(500).json({ ok: false, error: e.message || String(e) });
    }
});
// 管理：查看与更新密钥（简化实现，未加认证，建议上线前加鉴权）
app.get('/api/admin/keys', admin_1.adminGuard, (_req, res) => {
    try {
        res.json((0, keys_1.maskedKeys)());
    }
    catch (e) {
        res.status(500).json({ error: e.message || String(e) });
    }
});
const KeysUpdateSchema = zod_1.z.object({
    deepseekApiKey: zod_1.z.string().optional(),
    iflytekAppId: zod_1.z.string().optional(),
    iflytekApiKey: zod_1.z.string().optional(),
    iflytekApiSecret: zod_1.z.string().optional(),
});
app.post('/api/admin/keys', admin_1.adminGuard, (req, res) => {
    const parse = KeysUpdateSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
    (0, keys_1.updateKeys)(parse.data);
    res.json({ ok: true });
});
// 测试 DeepSeek 密钥是否有效（尝试列出模型）
app.get('/api/admin/test/deepseek', admin_1.adminGuard, async (_req, res) => {
    try {
        const { deepseekApiKey } = (0, keys_2.getKeys)();
        if (!deepseekApiKey) {
            return res.status(400).json({ ok: false, error: '缺少 DEEPSEEK_API_KEY' });
        }
        const client = new openai_1.default({ apiKey: deepseekApiKey, baseURL: 'https://api.deepseek.com/v1' });
        const models = await client.models.list();
        const ids = (models.data || []).map(m => m.id).slice(0, 5);
        res.json({ ok: true, models: ids });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message || String(e) });
    }
});
const PlanInput = zod_1.z.object({
    destination: zod_1.z.string().min(1),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    budget: zod_1.z.number().optional(),
    partySize: zod_1.z.number().int().min(1),
    preferences: zod_1.z.array(zod_1.z.string()).default([]),
    currency: zod_1.z.string().default('CNY'),
});
app.post('/api/plan', async (req, res) => {
    const parse = PlanInput.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
    const input = parse.data;
    try {
        // 尝试使用 DeepSeek AI 生成行程
        const deepSeekService = new deepseek_1.default();
        const plan = await deepSeekService.generateTravelPlan(input);
        res.json(plan);
    }
    catch (error) {
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
const ParseTextSchema = zod_1.z.object({ text: zod_1.z.string().min(1), currency: zod_1.z.string().default('CNY') });
app.post('/api/ai/parse-plan', async (req, res) => {
    const parse = ParseTextSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
    const { text, currency } = parse.data;
    try {
        const svc = new deepseek_1.default();
        const r = await svc.extractPlanFields(text, currency);
        // 映射为前端智能填充使用的结构
        const budget = r.budget?.total ?? (r.budget?.perPerson != null && r.partySize != null ? Math.round((r.budget.perPerson) * r.partySize) : undefined);
        return res.json({
            destination: r.destination,
            startDate: r.startDate,
            endDate: r.endDate,
            budget,
            preferences: r.preferences,
            partySize: r.partySize,
        });
    }
    catch (e) {
        return res.status(500).json({ error: e.message || String(e) });
    }
});
// AI 解析自由文本为预算开销字段（预算页智能填充）
app.post('/api/ai/parse-expense', async (req, res) => {
    const parse = ParseTextSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
    const { text, currency } = parse.data;
    try {
        const svc = new deepseek_1.default();
        const r = await svc.extractExpenseFields(text, currency);
        return res.json({
            description: r.description,
            amount: r.amount,
            category: r.category,
            date: r.date,
        });
    }
    catch (e) {
        return res.status(500).json({ error: e.message || String(e) });
    }
});
const Expense = zod_1.z.object({ id: zod_1.z.string().optional(), description: zod_1.z.string(), category: zod_1.z.string(), amount: zod_1.z.number().nonnegative(), date: zod_1.z.string() });
const BudgetAnalyzeInput = zod_1.z.object({ expenses: zod_1.z.array(Expense), budgetCap: zod_1.z.number().optional(), currency: zod_1.z.string().default('CNY') });
app.post('/api/budget/analyze', (req, res) => {
    const parse = BudgetAnalyzeInput.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
    const { expenses, budgetCap, currency } = parse.data;
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const categories = new Map();
    expenses.forEach((e) => { categories.set(e.category, (categories.get(e.category) || 0) + e.amount); });
    const breakdown = Array.from(categories.entries()).map(([category, amount]) => ({ category, amount }));
    const suggestions = [];
    if (budgetCap != null) {
        const remaining = budgetCap - totalSpent;
        if (remaining < 0)
            suggestions.push('已超出预算，请缩减非必要消费。');
        else if (remaining < budgetCap * 0.1)
            suggestions.push('接近预算上限，建议降低购物或娱乐支出。');
        else
            suggestions.push('预算充足，可适当增加体验项目。');
        return res.json({ currency, totalSpent, budgetCap, remaining, breakdown, suggestions });
    }
    suggestions.push('设置预算上限可以获得更精确的建议。');
    res.json({ currency, totalSpent, breakdown, suggestions });
});
// 在 Docker 环境中，所有非 API 路由都返回前端应用
if (isDocker) {
    app.get('*', (req, res) => {
        // 跳过 API 路由
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'Not found' });
        }
        const publicPath = path_1.default.join(__dirname, '../../public');
        res.sendFile(path_1.default.join(publicPath, 'index.html'));
    });
}
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
