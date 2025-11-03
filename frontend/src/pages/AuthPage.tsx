import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE as string | undefined) || 'supabase';
const useSupabase = !!supabase && AUTH_MODE !== 'local';
import { useAuth } from '../context/auth';
import { listPlans, listExpenses } from '../lib/db';

export default function AuthPage() {
  const { user, loading, signOut, signInLocal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/';
  const configured = useSupabase || AUTH_MODE === 'local';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // 账户增强：昵称/概览/修改密码/会话刷新
  const [displayName, setDisplayName] = useState('');
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [expenseCount, setExpenseCount] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);

  useEffect(() => {
    // 仅在首页登录后跳转到功能页；进入 /auth 时应展示账户信息
    if (!loading && user && isRoot) {
      navigate('/planner', { replace: true });
    }
  }, [loading, user, isRoot, navigate]);
  // 保持 Hooks 顺序一致：不在 Hooks 之前 return；通过渲染条件控制显示。

  useEffect(() => {
    // 加载昵称（本地存储，按用户ID）与云端概览
    if (user) {
      try {
        const raw = localStorage.getItem(`profile:${user.id}`);
        if (raw) {
          const obj = JSON.parse(raw);
          setDisplayName(obj?.displayName || '');
        } else {
          setDisplayName('');
        }
      } catch {}
      (async () => {
        if (useSupabase) {
          try {
            const plans = await listPlans();
            const expenses = await listExpenses();
            setPlanCount((plans || []).length);
            setExpenseCount((expenses || []).length);
          } catch (e: any) {
            // 不影响页面其他功能
          }
          try {
            const s = await supabase!.auth.getSession();
            const u = await supabase!.auth.getUser();
            const parts: string[] = [];
            if (u.data.user?.email) parts.push(`email=${u.data.user.email}`);
            parts.push(`id=${u.data.user?.id}`);
            if (s.data.session) parts.push(`expires=${new Date((s.data.session.expires_at || 0) * 1000).toLocaleString()}`);
            setSessionInfo(parts.join(', '));
          } catch {}
        }
      })();
    } else {
      setDisplayName(''); setPlanCount(null); setExpenseCount(null); setSessionInfo(null);
    }
  }, [user]);

  const signUp = async () => {
    setError(null); setInfo(null);
    if (AUTH_MODE === 'local') {
      if (!email || !password) { setError('请输入邮箱和密码'); return; }
      setInfo('注册成功（开发模式，本地登录）');
      return;
    }
    if (!useSupabase) { setError('未配置 Supabase：请在 frontend/.env 设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'); return; }
    const { error } = await supabase!.auth.signUp({ email, password });
    if (error) setError(error.message); else setInfo('注册成功，请检查邮箱完成验证或直接登录。');
  };
  const signIn = async () => {
    setError(null); setInfo(null);
    if (AUTH_MODE === 'local') {
      if (!email || !password) { setError('请输入邮箱和密码'); return; }
      signInLocal?.(email);
      setInfo('登录成功（开发模式，本地登录）');
      // 让全局 auth 读取到本地用户（页面重渲染后导航将显示“我的账户”）
      return;
    }
    if (!useSupabase) { setError('未配置 Supabase：请在 frontend/.env 设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'); return; }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setError(error.message); else setInfo('登录成功');
  };

  const saveDisplayName = () => {
    if (!user) return;
    try {
      const obj = { displayName };
      localStorage.setItem(`profile:${user.id}`, JSON.stringify(obj));
      setInfo('昵称已保存（本地）');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const refreshSession = async () => {
    setError(null); setInfo(null);
    try {
      if (useSupabase) {
        const s = await supabase!.auth.getSession();
        const u = await supabase!.auth.getUser();
        const parts: string[] = [];
        if (u.data.user?.email) parts.push(`email=${u.data.user.email}`);
        parts.push(`id=${u.data.user?.id}`);
        if (s.data.session) parts.push(`expires=${new Date((s.data.session.expires_at || 0) * 1000).toLocaleString()}`);
        setSessionInfo(parts.join(', '));
        setInfo('会话已刷新');
      } else {
        setInfo('本地开发模式，无会话');
      }
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const changePassword = async () => {
    setError(null); setInfo(null);
    if (!useSupabase) { setError('仅云端模式支持修改密码'); return; }
    if (!newPassword || newPassword.length < 6) { setError('请输入至少 6 位的新密码'); return; }
    try {
      const { error } = await supabase!.auth.updateUser({ password: newPassword });
      if (error) setError(error.message); else setInfo('密码已更新');
      setNewPassword('');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div className="panel">
      {loading ? (
        <h2>加载中…</h2>
      ) : user ? (
        isRoot ? (
          <>
            <h2>已登录，正在跳转…</h2>
            <p>{user.email || user.id}</p>
          </>
        ) : (
          <>
            <h2>我的账户</h2>
            <p>认证模式：{AUTH_MODE === 'local' ? '本地开发' : 'Supabase'}{configured ? '' : '（未配置）'}</p>
            <p>用户：{user.email || user.id}</p>
            {sessionInfo && <p>会话：{sessionInfo}</p>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn" onClick={refreshSession}>刷新会话</button>
              <button className="btn btn-outline" onClick={signOut}>退出登录</button>
            </div>

            <h3>资料</h3>
            <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
              <label>
                昵称（本地）
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="显示名称" />
              </label>
              <button className="btn btn-primary" onClick={saveDisplayName}>保存昵称</button>
            </div>

            <h3>云端数据概览</h3>
            {useSupabase ? (
              <p>行程：{planCount ?? '…'} 条；开销：{expenseCount ?? '…'} 条</p>
            ) : (
              <p>本地开发模式，无云端数据</p>
            )}

            {useSupabase && (
              <>
                <h3>安全</h3>
                <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
                  <label>
                    新密码
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 6 位" />
                  </label>
                  <button className="btn btn-danger" onClick={changePassword}>修改密码</button>
                </div>
              </>
            )}
          </>
        )
      ) : (
        <>
          <h2>登录 / 注册</h2>
          {!useSupabase && AUTH_MODE !== 'local' && (
            <p className="error">未配置 Supabase。请复制 frontend/.env.example 为 .env 并填写 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY；或设置 VITE_AUTH_MODE=local 进入本地开发登录。</p>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              邮箱
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              密码
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={signIn} disabled={!configured}>登录</button>
              <button onClick={signUp} disabled={!configured}>注册</button>
            </div>
            {error && <p className="error">{error}</p>}
            {info && <p>{info}</p>}
          </div>
        </>
      )}
    </div>
  );
}