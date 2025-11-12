import { useEffect, useState } from 'react';
import { Link, Route, Routes, Navigate } from 'react-router-dom';
import PlannerPage from './pages/PlannerPage';
import BudgetPage from './pages/BudgetPage';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import { useAuth } from './context/auth';

export default function App() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<string>(() => {
    // 优先读取设置页保存的 userSettings.theme
    try {
      const raw = localStorage.getItem('userSettings');
      if (raw) {
        const obj = JSON.parse(raw);
        const mode = obj?.theme as 'system' | 'light' | 'dark' | undefined;
        if (mode === 'light') return 'light';
        if (mode === 'dark') return 'dark';
        // system 或未设置：跟随系统
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
    } catch {}
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      // 同步到 userSettings 以覆盖“跟随系统”模式
      try {
        const raw = localStorage.getItem('userSettings');
        const obj = raw ? JSON.parse(raw) : {};
        obj.theme = next;
        localStorage.setItem('userSettings', JSON.stringify(obj));
      } catch {}
      localStorage.setItem('theme', next);
      return next;
    });
  };
  return (
    <div>
      <header className="header">
        <div className="container">
          <Link to="/" className="brand">AI 旅行规划</Link>
          <nav className="nav">
            {user ? (
              <>
                <Link className="nav-link" to="/planner">规划</Link>
                <Link className="nav-link" to="/plans">行程</Link>
                <Link className="nav-link" to="/budget">预算</Link>
                <Link className="nav-link" to="/settings">设置</Link>
                <Link className="nav-link" to="/auth">我的账户</Link>
              </>
            ) : (
              <Link className="nav-link" to="/">登录</Link>
            )}
          </nav>
          <button className="btn btn-outline" onClick={toggleTheme} aria-label="切换主题">
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
        </div>
      </header>
      <main className="container" style={{ paddingBottom: 32 }}>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/planner"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <PlannerPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/plans"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <PlansPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/plans/:id"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <PlanDetailPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/budget"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <BudgetPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <SettingsPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}