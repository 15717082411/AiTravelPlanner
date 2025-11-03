import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlanById } from '../lib/db';
import type { PlanResponse } from '../types/plan';
import { Itinerary } from '../components/Itinerary';

export default function PlanDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true); setError(null);
      try {
        const row: any = await getPlanById(id);
        const mapped: PlanResponse = {
          destination: row.destination,
          startDate: row.startdate,
          endDate: row.enddate,
          partySize: row.partysize,
          preferences: row.preferences || [],
          currency: row.currency,
          itinerary: row.itinerary || [],
          budget: row.budget || { totalEstimate: 0 },
          source: row.source || 'deepseek',
        };
        setData(mapped);
      } catch (e: any) { setError(e.message || String(e)); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>行程详情</h2>
        <Link className="btn btn-outline" to="/plans">返回列表</Link>
      </div>
      {loading && <p>加载中…</p>}
      {error && <p className="error">{error}</p>}
      {data && <Itinerary data={data} />}
    </div>
  );
}