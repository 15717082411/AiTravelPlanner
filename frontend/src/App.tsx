import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, Navigate } from 'react-router-dom';
import PlannerPage from './pages/PlannerPage';
import BudgetPage from './pages/BudgetPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/auth';
import { loadAMap } from './lib/amap';

function MapView() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: any;
    loadAMap()
      .then((AMap) => {
        if (!mapRef.current) return;
        map = new AMap.Map(mapRef.current, { viewMode: '2D', zoom: 11 });
      })
      .catch((e) => setError(e.message || String(e)));
    return () => { map && map.destroy && map.destroy(); };
  }, []);

  return (
    <div className="map-layout">
      <div className="map" ref={mapRef} />
      <aside className="panel">
        <h2>行程规划</h2>
        <p>在地图上选择地点，生成行程与预算。</p>
        {error && <p className="error">地图加载失败：{error}</p>}
      </aside>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <div>
      <header className="header">
        <nav>
          {user ? (
            <>
              <Link to="/map">地图</Link>
              <Link to="/planner">规划</Link>
              <Link to="/budget">预算</Link>
              <Link to="/auth">我的账户</Link>
            </>
          ) : (
            <Link to="/">登录</Link>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/map"
            element={
              loading ? (
                <div style={{ padding: 16 }}>正在加载登录状态…</div>
              ) : user ? (
                <MapView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
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
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}