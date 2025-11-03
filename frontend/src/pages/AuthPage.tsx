import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';

export default function AuthPage() {
  const { user, loading, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) return <div className="panel">加载中…</div>;
  if (user) {
    return (
      <div className="panel">
        <h2>账户</h2>
        <p>已登录：{user.email || user.id}</p>
        <button onClick={signOut}>退出登录</button>
      </div>
    );
  }

  const signUp = async () => {
    setError(null); setInfo(null);
    const { error } = await supabase!.auth.signUp({ email, password });
    if (error) setError(error.message); else setInfo('注册成功，请检查邮箱完成验证或直接登录。');
  };
  const signIn = async () => {
    setError(null); setInfo(null);
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setError(error.message); else setInfo('登录成功');
  };

  return (
    <div className="panel">
      <h2>登录 / 注册</h2>
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
          <button onClick={signIn}>登录</button>
          <button onClick={signUp}>注册</button>
        </div>
        {error && <p className="error">{error}</p>}
        {info && <p>{info}</p>}
      </div>
    </div>
  );
}