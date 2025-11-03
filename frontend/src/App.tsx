import { useEffect, useRef, useState } from 'react';
import { loadAMap } from './lib/amap';
import { Link, Route, Routes } from 'react-router-dom';

function MapView() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: any;
    loadAMap()
      .then((AMap) => {
        if (!mapRef.current) return;
        map = new AMap.Map(mapRef.current, {
          viewMode: '2D',
          zoom: 11,
        });
      })
      .catch((e) => setError(e.message || String(e)));
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      map && map.destroy && map.destroy();
    };
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
  return (
    <div>
      <header className="header">
        <nav>
          <Link to="/">地图</Link>
          <Link to="/planner">规划</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/planner" element={<div>规划页占位</div>} />
        </Routes>
      </main>
    </div>
  );
}