export async function loadAMap() {
  if ((window as any).AMap) return (window as any).AMap;
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
  if (!key) {
    throw new Error('未配置 VITE_AMAP_KEY（高德地图 Web JS API Key）');
  }
  const src = `https://webapi.amap.com/maps?v=2.0&key=${key ?? ''}`;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = (e) => reject(new Error('AMap 脚本加载失败'));
    document.head.appendChild(s);
  });
  return (window as any).AMap;
}