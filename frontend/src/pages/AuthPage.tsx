import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE as string | undefined) || 'supabase';
const useSupabase = !!supabase && AUTH_MODE !== 'local';
import { useAuth } from '../context/auth';

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

  useEffect(() => {
    // 仅在首页登录后跳转到功能页；进入 /auth 时应展示账户信息
    if (!loading && user && isRoot) {
      navigate('/planner', { replace: true });
    }
  }, [loading, user, isRoot, navigate]);
  // 保持 Hooks 顺序一致：不在 Hooks 之前 return；通过渲染条件控制显示。

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
            <h2>账户</h2>
            <p>已登录：{user.email || user.id}</p>
            <button onClick={signOut}>退出登录</button>
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