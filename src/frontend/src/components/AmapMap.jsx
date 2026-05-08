import { useEffect, useRef } from 'react';
import useAmapLoader from '../hooks/useAmapLoader.js';

export default function AmapMap({ lng, lat, name, height = 280 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const { AMap, loading, error } = useAmapLoader();

  useEffect(() => {
    if (!AMap || !containerRef.current || !Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
      return undefined;
    }

    const center = [Number(lng), Number(lat)];
    if (!mapRef.current) {
      mapRef.current = new AMap.Map(containerRef.current, {
        zoom: 14,
        center,
        resizeEnable: true,
      });
    } else {
      mapRef.current.setCenter(center);
    }

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new AMap.Marker({
      position: center,
      title: name || '当前位置',
    });
    markerRef.current.setMap(mapRef.current);

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [AMap, lat, lng, name]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }
  }, []);

  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
    return (
      <div className="rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        当前景点缺少坐标信息
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        正在加载高德地图...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-sm px-4 text-center" style={{ height }}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="rounded-2xl overflow-hidden border border-gray-200" style={{ height }} />;
}
