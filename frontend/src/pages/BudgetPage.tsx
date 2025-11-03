import { useEffect, useMemo, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { addExpense, loadExpenses, removeExpense, saveExpenses } from '../lib/budgetStore';
import type { Expense, BudgetAnalysis } from '../types/budget';
import { postBudgetAnalyze, postParseExpenseText } from '../lib/api';
import { saveExpensesToCloud, listExpenses } from '../lib/db';
import { useAuth } from '../context/auth';

function parseAmount(text: string): number | undefined {
  const m = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (m) return Number(m[1]);
  return undefined;
}

function parseCategory(text: string): string | undefined {
  const t = (text || '').toLowerCase();
  // 餐饮
  if (t.includes('餐饮') || t.includes('吃') || t.includes('饭') || t.includes('餐') || t.includes('早餐') || t.includes('午餐') || t.includes('晚餐') || t.includes('餐厅')) {
    return '餐饮';
  }
  // 交通
  if (t.includes('交通') || t.includes('地铁') || t.includes('公交') || t.includes('出租') || t.includes('打车') || t.includes('高铁') || t.includes('火车') || t.includes('飞机') || t.includes('机票')) {
    return '交通';
  }
  // 住宿
  if (t.includes('住宿') || t.includes('酒店') || t.includes('旅馆') || t.includes('民宿')) {
    return '住宿';
  }
  // 门票
  if (t.includes('门票') || t.includes('景点') || t.includes('门费') || t.includes('入场') || t.includes('票')) {
    return '门票';
  }
  // 购物
  if (t.includes('购物') || t.includes('买') || t.includes('购买') || t.includes('纪念品') || t.includes('礼物') || t.includes('衣服') || t.includes('化妆品')) {
    return '购物';
  }
  return undefined; // 未识别则保持原分类
}

function toISODate(y: number, m: number, d: number): string {
  const dt = new Date(y, m - 1, d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(text: string): string | undefined {
  const t = (text || '').toLowerCase();
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days: number) => {
    const dt = new Date(base);
    dt.setDate(dt.getDate() + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const weekdayFromChar = (ch: string): number | undefined => {
    switch (ch) {
      case '一': return 1; // Monday
      case '二': return 2;
      case '三': return 3;
      case '四': return 4;
      case '五': return 5;
      case '六': return 6;
      case '日':
      case '天': return 0; // Sunday
      default: return undefined;
    }
  };
  const forwardOffset = (target: number) => (target - base.getDay() + 7) % 7;

  // 周末（上/下/本周末）或普通“周末”
  let mwk = t.match(/(上|下|本)?(?:(?:周|星期|礼拜))末/);
  if (mwk) {
    const qualifier = mwk[1];
    const sat = 6; // Saturday
    const offSat = forwardOffset(sat);
    if (qualifier === '上') return shift(offSat - 7);
    if (qualifier === '下') return shift(offSat + 7);
    // 本周或无限定：取本周内将到来的周六
    return shift(offSat);
  }

  // 周几（上/下/本周X）或普通“周X”
  mwk = t.match(/(上|下|本)?(?:(?:周|星期|礼拜))(一|二|三|四|五|六|日|天)/);
  if (mwk) {
    const qualifier = mwk[1];
    const ch = mwk[2];
    const target = weekdayFromChar(ch);
    if (target == null) return undefined;
    const fwd = forwardOffset(target);
    if (qualifier === '上') return shift(fwd - 7);
    if (qualifier === '下') return shift(fwd + 7);
    if (qualifier === '本') return shift(fwd); // 本周内将到来的该日（今天则为0）
    // 无限定：选择最近的该周几（距离最小，若前向距离<=3取前向，否则取上一个）
    const offset = fwd <= 3 ? fwd : fwd - 7;
    return shift(offset);
  }

  // 相对日期词
  if (t.includes('今天')) return shift(0);
  if (t.includes('昨天')) return shift(-1);
  if (t.includes('前天')) return shift(-2);
  if (t.includes('明天')) return shift(1);
  if (t.includes('后天')) return shift(2);

  // 绝对日期：YYYY-MM-DD / YYYY年MM月DD日
  let m;
  m = t.match(/(\d{4})[年\-\/\.](\d{1,2})[月\-\/\.](\d{1,2})[日号]?/);
  if (m) return toISODate(Number(m[1]), Number(m[2]), Number(m[3]));

  // 绝对日期：MM月DD日（年份默认当前年）
  m = t.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (m) return toISODate(now.getFullYear(), Number(m[1]), Number(m[2]));

  // 绝对日期：MM-DD 或 MM/DD 或 MM.DD（可选年份在第三段）
  m = t.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (m) {
    const mmNum = Number(m[1]);
    const ddNum = Number(m[2]);
    let yy = m[3] ? Number(m[3]) : now.getFullYear();
    if (m[3] && m[3].length === 2) yy = 2000 + yy;
    return toISODate(yy, mmNum, ddNum);
  }

  return undefined;
}

export default function BudgetPage() {
  const { listening, transcript, start, stop } = useSpeechRecognition();
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>(() => loadExpenses());
  const [form, setForm] = useState<{ description: string; amount?: number; category: string; date: string }>(() => ({
    description: '', amount: undefined, category: '餐饮', date: new Date().toISOString().slice(0, 10),
  }));
  const [cap, setCap] = useState<number | ''>('');
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [useAI, setUseAI] = useState<boolean>(true);
  const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  const applySpeechToForm = async () => {
    if (!transcript) return;
    setError(null); setInfo(null);
    let desc = transcript;
    let amt = parseAmount(transcript);
    let cat = parseCategory(transcript);
    let dt = parseDate(transcript);
    if (useAI) {
      try {
        const ai = await postParseExpenseText(transcript);
        if (ai.description) desc = ai.description;
        if (ai.amount != null) amt = ai.amount;
        if (ai.category) cat = ai.category as any;
        if (ai.date) dt = ai.date;
        setInfo('智能填充完成（AI）');
      } catch (e) {
        console.warn('AI 解析失败，使用本地规则：', e);
        setInfo('智能填充完成（规则）');
      }
    } else {
      setInfo('智能填充完成（规则）');
    }
    setForm((f) => ({ ...f, description: desc, amount: amt ?? f.amount, category: cat ?? f.category, date: dt ?? f.date }));
  };

  // 语音输入进行时，实时将识别文本写入“描述”输入框
  useEffect(() => {
    if (listening) {
      setForm((f) => ({ ...f, description: transcript }));
    }
  }, [listening, transcript]);

  const add = () => {
    if (!form.description || form.amount == null) { setError('请填写描述与金额'); return; }
    setError(null);
    const next = addExpense({ description: form.description, amount: form.amount, category: form.category, date: form.date });
    setItems(next);
    setForm({ description: '', amount: undefined, category: form.category, date: form.date });
  };

  const analyze = async () => {
    setError(null); setAnalysis(null);
    try {
      const res = await postBudgetAnalyze(items, typeof cap === 'number' ? cap : undefined);
      setAnalysis(res);
    } catch (e: any) { setError(e.message || String(e)); }
  };

  const syncCloud = async () => {
    try {
      setInfo(null);
      await saveExpensesToCloud(items, 'CNY', typeof cap === 'number' ? cap : undefined);
      setInfo('已同步到云端');
    } catch (e: any) { setError(e.message || String(e)); }
  };

  const loadCloud = async () => {
    try {
      setError(null); setInfo(null);
      const rows = await listExpenses();
      const mapped: Expense[] = rows.map((r: any) => ({ id: r.id, description: r.description, category: r.category, amount: r.amount, date: r.date }));
      setItems(mapped);
      saveExpenses(mapped);
      setInfo('已从云端加载');
    } catch (e: any) { setError(e.message || String(e)); }
  };

  return (
    <div className="panel">
      <h2>费用预算与管理</h2>
      <div className="form-grid">
        <label>
          描述
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="如：午餐、门票" />
        </label>
        <div className="form-actions">
          <button className="btn" type="button" onClick={listening ? stop : start}>{listening ? '停止语音' : '开始语音'}</button>
          <button className="btn btn-outline" type="button" onClick={applySpeechToForm} disabled={!transcript}>将识别文本填入表单</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} /> 使用AI解析
          </label>
          {user ? (
            <>
              <button className="btn" type="button" onClick={syncCloud} disabled={!items.length}>同步到云端</button>
              <button className="btn btn-outline" type="button" onClick={loadCloud} style={{ marginLeft: 8 }}>从云端加载</button>
            </>
          ) : (
            <span style={{ alignSelf: 'center' }}>登录后可同步到云端</span>
          )}
        </div>
        <label>
          金额（元）
          <input type="number" min={0} value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label>
          分类
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>餐饮</option>
            <option>交通</option>
            <option>住宿</option>
            <option>门票</option>
            <option>购物</option>
            <option>其他</option>
          </select>
        </label>
        <label>
          日期
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <button className="btn btn-primary" type="button" onClick={add}>添加开销</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>开销列表（合计：{total} 元）</h3>
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              {i.date} [{i.category}] {i.description} - {i.amount} 元
              <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={() => setItems(removeExpense(i.id))}>删除</button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>预算上限</h3>
        <input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value ? Number(e.target.value) : '')} placeholder="例如：10000" />
        <button className="btn btn-outline" style={{ marginLeft: 8 }} onClick={analyze}>AI 分析预算</button>
      </div>

      {error && <p className="error">{error}</p>}
      {analysis && (
        <div style={{ marginTop: 16 }}>
          <h3>分析结果</h3>
          <p>总支出：{analysis.totalSpent} 元；{analysis.budgetCap != null && <>预算上限：{analysis.budgetCap} 元；剩余：{analysis.remaining} 元</>}</p>
          <h4>分类拆分</h4>
          <ul>
            {analysis.breakdown.map((b) => (<li key={b.category}>{b.category}：{b.amount} 元</li>))}
          </ul>
          <h4>建议</h4>
          <ul>
            {analysis.suggestions.map((s, idx) => (<li key={idx}>{s}</li>))}
          </ul>
        </div>
      )}
      {info && <p className="info">{info}</p>}
    </div>
  );
}