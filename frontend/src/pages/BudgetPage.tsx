import { useMemo, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { addExpense, loadExpenses, removeExpense } from '../lib/budgetStore';
import { saveExpensesToCloud } from '../lib/db';
import { useAuth } from '../context/auth';
import type { Expense, BudgetAnalysis } from '../types/budget';
import { postBudgetAnalyze } from '../lib/api';

function parseAmount(text: string): number | undefined {
  const m = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (m) return Number(m[1]);
  return undefined;
}

export default function BudgetPage() {
  const { listening, transcript, start, stop } = useSpeechRecognition();
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>(() => loadExpenses());
  const [form, setForm] = useState<{ description: string; amount?: number; category: string; date: string }>(() => ({
    description: '',
    amount: undefined,
    category: '餐饮',
    date: new Date().toISOString().slice(0, 10),
  }));
  const [cap, setCap] = useState<number | ''>('');
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  const applySpeechToForm = () => {
    if (!transcript) return;
    const amt = parseAmount(transcript);
    setForm((f) => ({ ...f, description: transcript, amount: amt ?? f.amount }));
  };

  const add = () => {
    if (!form.description || form.amount == null) {
      setError('请填写描述与金额');
      return;
    }
    setError(null);
    const next = addExpense({ description: form.description, amount: form.amount, category: form.category, date: form.date });
    setItems(next);
    setForm({ description: '', amount: undefined, category: form.category, date: form.date });
  };

  const analyze = async () => {
    setError(null);
    setAnalysis(null);
    try {
      const res = await postBudgetAnalyze(items, typeof cap === 'number' ? cap : undefined);
      setAnalysis(res);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const syncToCloud = async () => {
    try {
      setInfo(null);
      await saveExpensesToCloud(items, 'CNY', typeof cap === 'number' ? cap : undefined);
      setInfo('已同步到云端');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div className="panel">
      <h2>费用预算与管理</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          描述
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="如：午餐、门票" />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={listening ? stop : start}>{listening ? '停止语音' : '开始语音'}</button>
          <button type="button" onClick={applySpeechToForm} disabled={!transcript}>将识别文本填入表单</button>
          {user ? (
            <button type="button" onClick={syncToCloud} disabled={!items.length}>同步到云端</button>
          ) : (
            <span style={{ alignSelf: 'center' }}>登录后可同步到云端</span>
          )}
        </div>
        <label>
          金额（元）
          <input
            type="number"
            min={0}
            value={form.amount ?? ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : undefined })}
          />
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
        <button type="button" onClick={add}>添加开销</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>开销列表（合计：{total} 元）</h3>
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              {i.date} [{i.category}] {i.description} - {i.amount} 元
              <button style={{ marginLeft: 8 }} onClick={() => setItems(removeExpense(i.id))}>删除</button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>预算上限</h3>
        <input
          type="number"
          min={0}
          value={cap}
          onChange={(e) => setCap(e.target.value ? Number(e.target.value) : '')}
          placeholder="例如：10000"
        />
        <button style={{ marginLeft: 8 }} onClick={analyze}>AI 分析预算</button>
      </div>

      {error && <p className="error">{error}</p>}
      {analysis && (
        <div style={{ marginTop: 16 }}>
          <h3>分析结果</h3>
          <p>
            总支出：{analysis.totalSpent} 元；
            {analysis.budgetCap != null && <>预算上限：{analysis.budgetCap} 元；剩余：{analysis.remaining} 元</>}
          </p>
          <h4>分类拆分</h4>
          <ul>
            {analysis.breakdown.map((b) => (
              <li key={b.category}>
                {b.category}：{b.amount} 元
              </li>
            ))}
          </ul>
          <h4>建议</h4>
          <ul>
            {analysis.suggestions.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {info && <p>{info}</p>}
    </div>
  );
}