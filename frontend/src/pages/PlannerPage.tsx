import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { postPlan } from '../lib/api';
import type { PlanInput, PlanResponse } from '../types/plan';
import { Itinerary } from '../components/Itinerary';
import { savePlanToCloud } from '../lib/db';
import { useAuth } from '../context/auth';
import MapView from '../components/MapView';

export default function PlannerPage() {
  const { listening, transcript, start, stop, error: speechError } = useSpeechRecognition();
  const { user } = useAuth();
  const [form, setForm] = useState<PlanInput>({ destination: '', startDate: '', endDate: '', budget: undefined, partySize: 1, preferences: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlanResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setData(null); setInfo(null);
    try {
      const res = await postPlan(form);
      setData(res);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const applySpeechToDestination = () => { if (transcript) setForm((f) => ({ ...f, destination: transcript })); };

  const saveCloud = async () => {
    if (!data) return;
    try {
      setInfo(null);
      await savePlanToCloud(data, form);
      setInfo('已保存到云端');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div className="planner">
      <MapView>
        <h2>智能行程规划</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            目的地
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="如：日本东京" />
          </label>
          <div className="form-actions">
            <button className="btn" type="button" onClick={listening ? stop : start}>{listening ? '停止语音' : '开始语音'}</button>
            <button className="btn btn-outline" type="button" onClick={applySpeechToDestination} disabled={!transcript}>填入识别文本</button>
            {speechError && <span className="error">{speechError}</span>}
          </div>
          <label>
            开始日期
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label>
            结束日期
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </label>
          <label>
            预算（元）
            <input type="number" min={0} value={form.budget ?? ''} onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
          <label>
            同行人数
            <input type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} />
          </label>
          <label>
            旅行偏好（用逗号分隔）
            <input placeholder="如：美食, 动漫, 亲子" onChange={(e) => setForm({ ...form, preferences: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '生成中…' : '生成行程'}</button>
        </form>
        {error && <p className="error">{error}</p>}
        {data && (
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <Itinerary data={data} />
            {user ? (<button className="btn" onClick={saveCloud}>保存到云端</button>) : (<p>登录后可保存到云端</p>)}
            {info && <p>{info}</p>}
          </div>
        )}
      </MapView>
    </div>
  );
}