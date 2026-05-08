import { useEffect, useRef } from 'react';
import useAmapLoader from '../hooks/useAmapLoader.js';

export default function AmapRouteMap({ origin, destination, polyline = [], height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
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
