import React, { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

type Props = {
  destination?: string;
};

/**
 * 简单的 OSM 地图组件。
 * - 默认居中到北京坐标；你可以后续接入地理编码根据目的地动态定位。
 * - 仅渲染底图，不含 Marker，避免静态资源路径问题。
 */
export function PlannerMap({ destination }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const key = (import.meta.env.VITE_AMAP_KEY || '').trim();
  const securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim();

  useEffect(() => {
    let map: any;
    let geocoder: any;

    // 可选安全码
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = { securityJsCode };
    }

    const load = async () => {
      if (!containerRef.current || !key) return;
      const AMap = await AMapLoader.load({
        key,
        version: '2.0',
        plugins: ['AMap.Geocoder'],
      });
      map = new AMap.Map(containerRef.current, {
        viewMode: '2D',
        zoom: 10,
        center: [116.4074, 39.9042], // 默认北京
      });
      geocoder = new AMap.Geocoder();

      if (destination && destination.trim()) {
        geocoder.getLocation(destination.trim(), (status: string, result: any) => {
          if (status === 'complete' && result?.geocodes?.length) {
            const loc = result.geocodes[0].location;
            map.setZoom(12);
            map.setCenter([loc.lng, loc.lat]);
          }
        });
      }
    };
    load();

    return () => { try { map?.destroy?.(); } catch { /* noop */ } };
  }, [destination, key, securityJsCode]);

  return (
    <div className="card" style={{ height: 400, overflow: 'hidden' }}>
      <div style={{ padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <strong>地图（高德）</strong>
        {destination && (
          <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>目的地：{destination}</span>
        )}
      </div>
      <div ref={containerRef} style={{ height: 'calc(100% - 40px)', width: '100%' }} />
    </div>
  );
}

export default PlannerMap;