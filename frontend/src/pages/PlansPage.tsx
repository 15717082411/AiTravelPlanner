import { useEffect, useState } from 'react';
import { listPlans, deletePlan } from '../lib/db';
import { Link } from 'react-router-dom';

type PlanRow = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  partySize: number;
  preferences: string[];
  currency: string;
  created_at: string;
};

export default function PlansPage() {
  const [items, setItems] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null); setInfo(null);
    try {
      const rows = await listPlans();
      const mapped = (rows || []).map((r: any) => ({
        id: r.id,
        destination: r.destination,
        startDate: r.startdate,
        endDate: r.enddate,
        partySize: r.partysize,
        preferences: r.preferences || [],
        currency: r.currency,
        created_at: r.created_at,
      }));
      setItems(mapped as any);
      if (!rows?.length) setInfo('暂无已保存行程');
    } catch (e: any) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    setError(null); setInfo(null);
    try {
      await deletePlan(id);
      setItems((arr) => arr.filter((x) => x.id !== id));
      setInfo('已删除行程');
    } catch (e: any) { setError(e.message || String(e)); }
  }

  return (
    <div className="panel">
      <h2>我的行程</h2>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-outline" onClick={load} disabled={loading}>{loading ? '加载中…' : '刷新'}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p>{info}</p>}
      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
        {items.map((p) => (
          <li key={p.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{p.destination}</strong>
              <span>{new Date(p.created_at).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {p.startDate} → {p.endDate} · {p.partySize} 人 · 偏好：{(p.preferences || []).join('、') || '无'}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Link className="btn" to={`/plans/${p.id}`}>详情</Link>
              <button className="btn btn-danger" onClick={() => remove(p.id)}>删除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}