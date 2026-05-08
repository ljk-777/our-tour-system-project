import { useEffect, useState } from 'react';

let amapPromise = null;

function loadAmapScript() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;

  const key = import.meta.env.VITE_AMAP_JS_API_KEY;
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
  if (!key || !securityJsCode) {
    return Promise.reject(new Error('AMap JS API key is not configured'));
  }

  window._AMapSecurityConfig = { securityJsCode };

  amapPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-amap-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AMap));
      existing.addEventListener('error', () => reject(new Error('Failed to load AMap SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
    script.async = true;
    script.defer = true;
    script.dataset.amapSdk = 'true';
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error('Failed to load AMap SDK'));
    document.head.appendChild(script);
  });

  return amapPromise;
}

export default function useAmapLoader() {
  const [AMap, setAMap] = useState(() => window.AMap || null);
  const [loading, setLoading] = useState(!window.AMap);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    loadAmapScript()
      .then((sdk) => {
        if (!active) return;
        setAMap(sdk);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || '加载高德地图失败');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { AMap, loading, error };
}
