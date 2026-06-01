import { useEffect, useRef } from 'react';
import useAmapLoader from '../hooks/useAmapLoader.js';

export default function AmapRouteMap({ origin, destination, polyline = [], height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const polylinesRef = useRef([]);
  const { AMap, loading, error } = useAmapLoader();

  useEffect(() => {
    if (!AMap || !containerRef.current) return undefined;
    if (!origin?.location || !destination?.location) return undefined;

    const originPoint = [Number(origin.location.lng), Number(origin.location.lat)];
    const destinationPoint = [Number(destination.location.lng), Number(destination.location.lat)];

    if (!mapRef.current) {
      mapRef.current = new AMap.Map(containerRef.current, {
        zoom: 13,
        center: originPoint,
        resizeEnable: true,
      });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [
      new AMap.Marker({ position: originPoint, title: origin.name || '起点' }),
      new AMap.Marker({ position: destinationPoint, title: destination.name || '终点' }),
    ];
    markersRef.current.forEach((marker) => marker.setMap(mapRef.current));

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const path = Array.isArray(polyline) && polyline.length > 0 ? polyline : [originPoint, destinationPoint];
    polylineRef.current = new AMap.Polyline({
      path,
      strokeColor: '#1677ff',
      strokeWeight: 6,
      strokeOpacity: 0.85,
      showDir: true,
    });
    polylineRef.current.setMap(mapRef.current);
    mapRef.current.setFitView([...markersRef.current, polylineRef.current]);

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [AMap, destination, origin, polyline]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }
  }, []);

  if (!origin?.location || !destination?.location) {
    return (
      <div className="rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        请选择起点和终点后查看地图
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        正在加载高德路线地图...
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

export function AmapMultiRouteMap({ waypoints = [], segments = [], height = 300 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const { AMap, loading, error } = useAmapLoader();

  useEffect(() => {
    if (!AMap || !containerRef.current) return undefined;
    const points = normalizeWaypoints(waypoints);
    if (points.length < 2) return undefined;

    if (!mapRef.current) {
      mapRef.current = new AMap.Map(containerRef.current, {
        zoom: 12,
        center: [points[0].lng, points[0].lat],
        resizeEnable: true,
      });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    polylinesRef.current.forEach((line) => line.setMap(null));

    markersRef.current = points.map((point, index) => new AMap.Marker({
      position: [point.lng, point.lat],
      title: point.name,
      offset: new AMap.Pixel(-13, -28),
      content: buildWaypointMarker(point, index, points.length),
    }));
    markersRef.current.forEach((marker) => marker.setMap(mapRef.current));

    const pointMap = new Map(points.map((point) => [String(point.id), point]));
    polylinesRef.current = (segments || [])
      .map((segment) => {
        const from = pointMap.get(String(segment.from));
        const to = pointMap.get(String(segment.to));
        const path = normalizePath(segment.polyline);
        const fallbackPath = from && to ? [[from.lng, from.lat], [to.lng, to.lat]] : [];
        const finalPath = path.length > 0 ? path : fallbackPath;
        if (finalPath.length < 2) return null;
        return new AMap.Polyline({
          path: finalPath,
          strokeColor: modeColor(segment.mode),
          strokeWeight: segment.mode === 'walking' ? 5 : 7,
          strokeOpacity: 0.88,
          strokeStyle: segment.mode === 'walking' ? 'dashed' : 'solid',
          showDir: true,
          zIndex: 40,
        });
      })
      .filter(Boolean);
    polylinesRef.current.forEach((line) => line.setMap(mapRef.current));

    const fitItems = [...markersRef.current, ...polylinesRef.current];
    if (fitItems.length > 0) mapRef.current.setFitView(fitItems, false, [28, 28, 28, 28]);

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      polylinesRef.current.forEach((line) => line.setMap(null));
    };
  }, [AMap, segments, waypoints]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }
  }, []);

  if (normalizeWaypoints(waypoints).length < 2) {
    return (
      <div className="rounded-md bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        生成路线后查看地图
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-md bg-gray-100 text-gray-500 flex items-center justify-center text-sm" style={{ height }}>
        正在加载高德路线地图...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 text-red-600 flex items-center justify-center text-sm px-4 text-center" style={{ height }}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="rounded-md overflow-hidden border border-blue-100" style={{ height }} />;
}

function normalizeWaypoints(waypoints) {
  return (waypoints || [])
    .map((point) => ({
      ...point,
      lng: Number(point.lng),
      lat: Number(point.lat),
    }))
    .filter((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat));
}

function normalizePath(path) {
  return (path || [])
    .map((point) => Array.isArray(point) ? [Number(point[0]), Number(point[1])] : [Number(point.lng), Number(point.lat)])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

function modeColor(mode) {
  return ({
    walking: '#2563eb',
    cycling: '#16a34a',
    driving: '#f97316',
    transit: '#7c3aed',
  })[mode] || '#0f172a';
}

function buildWaypointMarker(point, index, total) {
  const label = index === 0 ? '起' : index === total - 1 ? '终' : `${index}`;
  return `
    <div style="
      min-width:26px;height:26px;border-radius:999px;background:#ffffff;color:#2563eb;
      border:2px solid #2563eb;display:grid;place-items:center;font-size:12px;font-weight:800;
      box-shadow:0 8px 18px rgba(37,99,235,.22);padding:0 4px;
    " title="${point.name || ''}">${label}</div>
  `;
}
