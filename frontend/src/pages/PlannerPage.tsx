import { useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { postPlan, postParsePlanText } from '../lib/api';
import type { PlanInput, PlanResponse } from '../types/plan';
import { Itinerary } from '../components/Itinerary';
import { savePlanToCloud } from '../lib/db';
import { useAuth } from '../context/auth';
import PlannerMap from '../components/PlannerMap';


export default function PlannerPage() {
  const { listening, transcript, start, stop, error: speechError } = useSpeechRecognition();
  const { user } = useAuth();
  const [form, setForm] = useState<PlanInput>({ destination: '', startDate: '', endDate: '', budget: undefined, partySize: 1, preferences: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlanResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechApplying, setSpeechApplying] = useState(false);
  const lastParsedRef = useRef<string>('');

  const formatISODate = (date: Date) => date.toISOString().slice(0, 10);
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };
  const ensureISO = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return value.slice(0, 10);
  };

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

  const canApplySpeech = !!transcript && !speechApplying;
  const applySpeechToDestination = async () => {
    if (!transcript) return;
    setSpeechStatus('正在解析语音…');
    setSpeechApplying(true);
    try {
      const parsed = await postParsePlanText(transcript);
      setForm((prev) => {
        const fallbackParty = prev.partySize && prev.partySize > 0 ? prev.partySize : 1;
        const fallbackPrefs = prev.preferences && prev.preferences.length > 0 ? prev.preferences : [];
        const fallbackStart = ensureISO(prev.startDate, '');
        const fallbackEnd = ensureISO(prev.endDate, '');
        const fallbackBudget = prev.budget;
        const today = new Date();
        const computedStart = ensureISO(parsed.startDate, fallbackStart || formatISODate(today));
        const baseStartDate = new Date(computedStart);
        const computedEnd = ensureISO(parsed.endDate, fallbackEnd || formatISODate(addDays(baseStartDate, 2)));

        const preferences = Array.isArray(parsed.preferences) ? parsed.preferences.map((p) => String(p).trim()).filter(Boolean) : prev.preferences;
        const finalPrefs = (preferences && preferences.length > 0) ? preferences : fallbackPrefs;
        return {
          destination: parsed.destination || transcript || prev.destination,
          startDate: computedStart,
          endDate: computedEnd,
          budget: parsed.budget != null ? parsed.budget : fallbackBudget,
          partySize: parsed.partySize != null && parsed.partySize > 0 ? parsed.partySize : fallbackParty,
          preferences: finalPrefs,
          currency: prev.currency,
        };
      });
      setSpeechStatus('语音已填充表单');
      lastParsedRef.current = transcript;
    } catch (e: any) {
      console.warn('解析行程语音失败，回退到目的地填充：', e);
      setForm((prev) => ({ ...prev, destination: transcript }));
      setSpeechStatus(e?.message ? `语音解析失败：${e.message}` : '语音解析失败，已仅填入目的地');
      lastParsedRef.current = transcript;
    } finally {
      setSpeechApplying(false);
    }
  };

  // 自动在一次识别结束后填充（避免用户必须点按钮）
  useEffect(() => {
    if (!listening && transcript && transcript !== lastParsedRef.current && !speechApplying) {
      applySpeechToDestination();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

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
    <div className="panel">
      <h2>智能行程规划</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            目的地
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="如：日本东京" />
          </label>
          <div className="form-actions">
            <button className="btn" type="button" onClick={listening ? stop : start}>{listening ? '停止语音' : '开始语音'}</button>
            <button className="btn btn-outline" type="button" onClick={applySpeechToDestination} disabled={!canApplySpeech} title={!transcript ? '暂无识别文本' : (speechApplying ? '正在解析语音…' : '')}>
              {speechApplying ? '填充中…' : '填入识别文本'}
            </button>
            {speechError && <span className="error">{speechError}</span>}
            {speechStatus && <span className="info">{speechStatus}</span>}
          </div>
          {!!transcript && (
            <div className="hint" style={{ marginTop: -8, opacity: 0.8 }}>
              识别结果预览：{transcript}
            </div>
          )}
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
            <input value={form.preferences.join(', ')} placeholder="如：美食, 动漫, 亲子" onChange={(e) => setForm({ ...form, preferences: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '生成中…' : '生成行程'}</button>
        </form>
        <div>
          <PlannerMap destination={form.destination} />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {data && (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Itinerary data={data} />
          {user ? (<button className="btn" onClick={saveCloud}>保存到云端</button>) : (<p>登录后可保存到云端</p>)}
          {info && <p>{info}</p>}
        </div>
      )}
    </div>
  );
}