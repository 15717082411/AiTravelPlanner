import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { loadAMap } from '../lib/amap';

export default function MapView({ children }: { children?: ReactNode }) {
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
        {children ? (
          <>
            {children}
            {error && <p className="error">地图加载失败：{error}</p>}
          </>
        ) : (
          <>
            <h2>行程规划</h2>
            <p>在地图上选择地点，生成行程与预算。</p>
            {error && <p className="error">地图加载失败：{error}</p>}
          </>
        )}
      </aside>
    </div>
  );
}