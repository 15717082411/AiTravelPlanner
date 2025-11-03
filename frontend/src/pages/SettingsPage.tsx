import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { getMaskedKeys, updateKeys, type KeysPayload, getIflytekSign, testDeepseek, testIflytek } from '../lib/admin';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<KeysPayload>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [signInfo, setSignInfo] = useState<string | null>(null);
  const [deepseekInfo, setDeepseekInfo] = useState<string | null>(null);
  const [iflytekHost, setIflytekHost] = useState<string>('');
  const [iflytekTestInfo, setIflytekTestInfo] = useState<string | null>(null);
  // 用户偏好设置
  type UserPrefs = { theme?: 'system' | 'light' | 'dark'; currency?: 'CNY' | 'USD' | 'EUR'; speechEnabled?: boolean };
  const [prefs, setPrefs] = useState<UserPrefs>({ theme: 'system', currency: 'CNY', speechEnabled: true });
  const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE as string | undefined) || 'supabase';
  const useSupabase = !!supabase && AUTH_MODE !== 'local';
  const configured = useSupabase || AUTH_MODE === 'local';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const masked = await getMaskedKeys(adminToken);
        if (mounted) setForm(masked);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    })();
    return () => { mounted = false; };
  }, [adminToken]);

  useEffect(() => {
    // 加载本地用户偏好
    try {
      const raw = localStorage.getItem('userSettings');
      if (raw) {
        const obj = JSON.parse(raw);
        setPrefs((p) => ({ ...p, ...obj }));
      }
    } catch {}
  }, []);

  const save = async () => {
    setError(null); setInfo(null); setLoading(true);
    try {
      // 直接提交当前表单值，后端按字段更新
      await updateKeys(form, adminToken);
      setInfo('密钥已更新，立即生效');
    } catch (e: any) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  };

  const testSign = async () => {
    setError(null); setSignInfo(null);
    try {
      const s = await getIflytekSign(adminToken);
      setSignInfo(`host=${s.host}, appId=${s.appId}, date=${s.date}, authLen=${s.authorization.length}`);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const testDeepseekKey = async () => {
    setError(null); setDeepseekInfo(null);
    try {
      const r = await testDeepseek(adminToken);
      if (r.ok) setDeepseekInfo(`可用，models=${(r.models || []).join(', ')}`);
      else setError(r.error || 'DeepSeek 测试失败');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const testIflytekConn = async () => {
    setError(null); setIflytekTestInfo(null);
    try {
      const r = await testIflytek(iflytekHost || undefined, adminToken);
      if (r.ok) setIflytekTestInfo(`握手成功（host=${r.host}）`);
      else setError(`握手失败（host=${r.host}）：${r.error || r.message || '未知错误'}`);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const savePrefs = () => {
    setError(null); setInfo(null);
    try {
      const next = { ...prefs };
      localStorage.setItem('userSettings', JSON.stringify(next));
      // 兼容旧逻辑：写入 theme 简化 App 读取
      const appliedTheme = next.theme === 'system'
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : next.theme || 'light';
      localStorage.setItem('theme', appliedTheme);
      setInfo('偏好设置已保存');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  if (!user) {
    return <div className="panel"><h2>设置</h2><p>请先登录后再进行安全设置。</p></div>;
  }

  return (
    <div className="panel">
      <h2>设置</h2>
      <h3>用户偏好</h3>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label>
          主题
          <select value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value as UserPrefs['theme'] })}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label>
          默认货币
          <select value={prefs.currency} onChange={(e) => setPrefs({ ...prefs, currency: e.target.value as UserPrefs['currency'] })}>
            <option value="CNY">人民币（CNY）</option>
            <option value="USD">美元（USD）</option>
            <option value="EUR">欧元（EUR）</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!prefs.speechEnabled} onChange={(e) => setPrefs({ ...prefs, speechEnabled: e.target.checked })} />
          启用语音识别（预算与规划页）
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={savePrefs}>保存偏好</button>
        </div>
      </div>

      <h3>云端配置状态</h3>
      <p style={{ marginTop: -8 }}>
        当前认证模式：{AUTH_MODE === 'local' ? '本地开发（无云端）' : 'Supabase'}；
        {configured ? '配置正常' : '未配置或不可用'}
      </p>

      <h3>安全设置</h3>
      <p>在此输入或更新后端使用的密钥。为安全起见，页面仅显示脱敏信息；更新后立即生效。</p>
      <div className="form-grid">
        <label>
          管理令牌（x-admin-token）
          <input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="若后端启用 ADMIN_TOKEN，这里需填写" />
        </label>
        <label>
          DeepSeek API Key
          <input type="password" value={form.deepseekApiKey || ''} onChange={(e) => setForm({ ...form, deepseekApiKey: e.target.value })} placeholder="用于 AI 规划生成" />
        </label>
        <label>
          讯飞 APP ID
          <input type="text" value={form.iflytekAppId || ''} onChange={(e) => setForm({ ...form, iflytekAppId: e.target.value })} />
        </label>
        <label>
          讯飞 API Key
          <input type="password" value={form.iflytekApiKey || ''} onChange={(e) => setForm({ ...form, iflytekApiKey: e.target.value })} />
        </label>
        <label>
          讯飞 API Secret
          <input type="password" value={form.iflytekApiSecret || ''} onChange={(e) => setForm({ ...form, iflytekApiSecret: e.target.value })} />
        </label>
        <label>
          讯飞测试域名（可选）
          <input type="text" value={iflytekHost} onChange={(e) => setIflytekHost(e.target.value)} placeholder="如：ws-api.xfyun.cn 或 iat-api.xfyun.cn" />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={save} disabled={loading}>{loading ? '保存中…' : '保存设置'}</button>
          <button className="btn btn-outline" type="button" onClick={testSign}>测试讯飞签名</button>
          <button className="btn btn-outline" type="button" onClick={testDeepseekKey}>测试 DeepSeek</button>
          <button className="btn btn-outline" type="button" onClick={testIflytekConn}>测试讯飞连接（后端）</button>
        </div>
        {error && <p className="error">{error}</p>}
        {info && <p>{info}</p>}
        {signInfo && <p>讯飞签名：{signInfo}</p>}
        {deepseekInfo && <p>DeepSeek：{deepseekInfo}</p>}
        {iflytekTestInfo && <p>讯飞连接：{iflytekTestInfo}</p>}
      </div>
    </div>
  );
}