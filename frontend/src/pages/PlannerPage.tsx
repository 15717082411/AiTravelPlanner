import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { postPlan } from '../lib/api';
import { savePlanToCloud } from '../lib/db';
import { useAuth } from '../context/auth';
import type { PlanInput, PlanResponse } from '../types/plan';
import { Itinerary } from '../components/Itinerary';

export default function PlannerPage() {
  const { listening, transcript, start, stop } = useSpeechRecognition();
  const { user } = useAuth();
  const [form, setForm] = useState<PlanInput>({
    destination: '',
    startDate: '',
    endDate: '',
    budget: undefined,
    partySize: 1,
    preferences: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlanResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await postPlan(form);
      setData(res);
      setInfo(null);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const applyTranscriptToDestination = () => {
    if (transcript) setForm((f) => ({ ...f, destination: transcript }));
  };

  const handleSavePlan = async () => {
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
    <div className="panel">
      <h2>智能行程规划</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          目的地
          <input
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="如：日本东京"
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={listening ? stop : start}>
            {listening ? '停止语音' : '开始语音'}
          </button>
          <button type="button" onClick={applyTranscriptToDestination} disabled={!transcript}>
            将识别文本填入目的地
          </button>
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
          <input
            type="number"
            min={0}
            value={form.budget ?? ''}
            onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          同行人数
          <input type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} />
        </label>
        <label>
          旅行偏好（用逗号分隔）
          <input
            placeholder="如：美食, 动漫, 亲子"
            onChange={(e) => setForm({ ...form, preferences: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? '生成中…' : '生成行程'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {data && (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Itinerary data={data} />
          {user ? (
            <button onClick={handleSavePlan}>保存到云端</button>
          ) : (
            <p>登录后可保存到云端</p>
          )}
          {info && <p>{info}</p>}
        </div>
      )}
    </div>
  );
}