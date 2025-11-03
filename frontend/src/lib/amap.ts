export function loadAMap(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
  if (!key) return Promise.reject(new Error('未配置 VITE_AMAP_KEY'));

  const existing = document.querySelector<HTMLScriptElement>('script[data-amap-sdk="true"]');
  if (existing && (window as any).AMap) {
    return Promise.resolve((window as any).AMap);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.dataset.amapSdk = 'true';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.async = true;
    script.onload = () => {
      const AMap = (window as any).AMap;
      if (AMap) resolve(AMap);
      else reject(new Error('AMap 加载失败'));
    };
    script.onerror = () => reject(new Error('AMap 脚本加载错误'));
    document.head.appendChild(script);
  });
}