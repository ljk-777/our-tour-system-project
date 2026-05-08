import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSpots } from '../api/index.js';
import useAmapLoader from '../hooks/useAmapLoader.js';

const TYPE_LABELS = {
  scenic: '景区',
  campus: '高校',
  restaurant: '美食',
};

const TYPE_COLORS = {
  scenic: '#34a853',
  campus: '#1a73e8',
  restaurant: '#ff6d00',
};

function normalizeType(type) {
  if (type === 'food') return 'restaurant';
  return type;
}

export default function MapPreview() {
  const navigate = useNavigate();
  const { AMap, loading: mapLoading, error: mapError } = useAmapLoader();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [spots, setSpots] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let active = true;
    setDataLoading(true);

    getSpots({ limit: 24, offset: 0 })
      .then((res) => {
        if (!active) return;
        const nextSpots = (res.data.data || []).filter((item) =>
          Number.isFinite(Number(item.lng)) && Number.isFinite(Number(item.lat))
        );
        setSpots(nextSpots);
        if (nextSpots.length > 0) {
          setActiveId(nextSpots[0].id);
        }
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredSpots = useMemo(() => {
    if (filter === 'all') return spots;
    return spots.filter((spot) => normalizeType(spot.type) === filter);
  }, [filter, spots]);

  const listItems = useMemo(
    () => [...filteredSpots].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 6),
    [filteredSpots]
  );

  useEffect(() => {
    if (!AMap || !containerRef.current || filteredSpots.length === 0) return undefined;

    const first = filteredSpots[0];
    const center = [Number(first.lng), Number(first.lat)];

    if (!mapRef.current) {
      mapRef.current = new AMap.Map(containerRef.current, {
        zoom: 5,
        center,
        resizeEnable: true,
      });
      mapRef.current.on('complete', () => {
        mapRef.current?.setFitView();
      });
    } else {
      mapRef.current.setCenter(center);
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = filteredSpots.map((spot) => {
      const marker = new AMap.Marker({
        position: [Number(spot.lng), Number(spot.lat)],
        title: spot.name,
        offset: new AMap.Pixel(-10, -20),
        content: buildMarkerHtml(spot, spot.id === activeId),
      });

      marker.on('click', () => {
        setActiveId(spot.id);
      });

      marker.setMap(mapRef.current);
      return marker;
    });

    mapRef.current.setFitView(markersRef.current);

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [AMap, activeId, filteredSpots]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !activeId) return;
    const activeSpot = filteredSpots.find((spot) => spot.id === activeId);
    if (!activeSpot) return;
    mapRef.current.setCenter([Number(activeSpot.lng), Number(activeSpot.lat)]);
    mapRef.current.setZoom(12);
  }, [activeId, filteredSpots]);

  const activeSpot = filteredSpots.find((spot) => spot.id === activeId);

  return (
    <div className="map-preview-root">
      <div className="map-search-bar">
        <div className="map-search-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="#5f6368" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ color: '#9aa0a6', fontSize: '14px', flex: 1 }}>
            {isMobile ? '真实高德地图预览' : '真实高德地图预览，点击景点或列表可查看详情'}
          </span>
          <div className="map-search-filters">
            {['all', 'scenic', 'campus', 'restaurant'].map((value) => (
              <button
                key={value}
                className={`map-filter-chip ${filter === value ? 'active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {value === 'all' ? '全部' : TYPE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-body">
        <div className="map-sidebar">
          <div className="map-sidebar-header">
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#202124' }}>热门景点</span>
            <span
              style={{ fontSize: '12px', color: '#1a73e8', cursor: 'pointer' }}
              onClick={() => navigate('/spots')}
            >
              查看全部 →
            </span>
          </div>

          {dataLoading ? (
            <div className="map-list">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="map-list-item" style={{ opacity: 0.5 }}>
                  <div className="map-list-rank">{index + 1}</div>
                  <div className="map-list-info">
                    <div className="map-list-name">加载中...</div>
                    <div className="map-list-meta">正在获取地图点位</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="map-list">
              {listItems.map((spot, index) => {
                const type = normalizeType(spot.type);
                const accent = TYPE_COLORS[type] || '#86868b';
                return (
                  <div
                    key={spot.id}
                    className={`map-list-item ${activeId === spot.id ? 'active' : ''}`}
                    onClick={() => setActiveId(spot.id)}
                    onDoubleClick={() => navigate(`/spots/${spot.id}`)}
                  >
                    <div className="map-list-rank">{index + 1}</div>
                    <div className="map-list-info">
                      <div className="map-list-name">{spot.name}</div>
                      <div className="map-list-meta">
                        <span className="map-list-tag" style={{ background: `${accent}15`, color: accent }}>
                          {TYPE_LABELS[type] || spot.type}
                        </span>
                        <span style={{ color: '#fbbc04', fontSize: '11px' }}>★</span>
                        <span style={{ fontSize: '11px', color: '#5f6368' }}>{spot.rating || '—'}</span>
                      </div>
                    </div>
                    <div className="map-list-pin-dot" style={{ background: accent }} />
                  </div>
                );
              })}
            </div>
          )}

          <button className="map-route-btn" onClick={() => navigate('/route')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            规划路线
          </button>
        </div>

        <div className="map-area" style={{ position: 'relative', overflow: 'hidden' }}>
          {mapError ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-red-600 bg-red-50">
              {mapError}
            </div>
          ) : (
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          )}

          {(mapLoading || dataLoading) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(2px)',
                color: '#5f6368',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              正在加载真实地图...
            </div>
          )}

          {activeSpot && !mapLoading && !dataLoading && (
            <div
              style={{
                position: 'absolute',
                left: isMobile ? 10 : 16,
                right: isMobile ? 58 : 'auto',
                bottom: isMobile ? 10 : 16,
                zIndex: 10,
                minWidth: isMobile ? 'auto' : 220,
                maxWidth: isMobile ? 'none' : 280,
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                borderRadius: isMobile ? 14 : 18,
                padding: isMobile ? '10px 10px 9px' : '14px 14px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'center' : 'stretch',
                  gap: isMobile ? 10 : 0,
                  flexDirection: isMobile ? 'row' : 'column',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: isMobile ? 13 : 15,
                      fontWeight: 700,
                      color: '#202124',
                      whiteSpace: isMobile ? 'nowrap' : 'normal',
                      overflow: isMobile ? 'hidden' : 'visible',
                      textOverflow: isMobile ? 'ellipsis' : 'clip',
                    }}
                  >
                    {activeSpot.name}
                  </div>
                  <div style={{ fontSize: isMobile ? 10 : 12, color: '#5f6368', marginTop: isMobile ? 2 : 4 }}>
                    {activeSpot.city} · {activeSpot.province}
                  </div>
                </div>
                {isMobile && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/spots/${activeSpot.id}`)}
                      style={pillButton('#1a73e8', '#fff', true)}
                    >
                      详情
                    </button>
                    <button
                      onClick={() => navigate(`/route?to=${activeSpot.id}&toName=${encodeURIComponent(activeSpot.name)}`)}
                      style={pillButton('#f5f5f7', '#202124', true)}
                    >
                      去这
                    </button>
                  </div>
                )}
              </div>
              {!isMobile && activeSpot.description && (
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 8, lineHeight: 1.5 }}>
                  {activeSpot.description.slice(0, 44)}
                  {activeSpot.description.length > 44 ? '...' : ''}
                </div>
              )}
              {!isMobile && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => navigate(`/spots/${activeSpot.id}`)}
                  style={pillButton('#1a73e8', '#fff', isMobile)}
                >
                  查看详情
                </button>
                <button
                  onClick={() => navigate(`/route?to=${activeSpot.id}&toName=${encodeURIComponent(activeSpot.name)}`)}
                  style={pillButton('#f5f5f7', '#202124', isMobile)}
                >
                  去这里
                </button>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 10,
              fontSize: isMobile ? 10 : 12,
              color: '#6e6e73',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 999,
              padding: isMobile ? '3px 8px' : '4px 10px',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            迹刻地图 · 高德
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMarkerHtml(spot, isActive) {
  const type = normalizeType(spot.type);
  const color = TYPE_COLORS[type] || '#86868b';
  const size = isActive ? 26 : 20;
  const shadow = isActive ? '0 8px 18px rgba(0,0,0,0.28)' : '0 4px 10px rgba(0,0,0,0.18)';

  return `
    <div style="position:relative; width:${size}px; height:${size + 10}px;">
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50% 50% 50% 0;
        background:${color};
        transform:rotate(-45deg);
        box-shadow:${shadow};
        border:2px solid rgba(255,255,255,0.92);
      "></div>
      <div style="
        position:absolute;
        left:${Math.round(size * 0.29)}px;
        top:${Math.round(size * 0.29)}px;
        width:${Math.round(size * 0.26)}px;
        height:${Math.round(size * 0.26)}px;
        background:#fff;
        border-radius:50%;
      "></div>
    </div>
  `;
}

function pillButton(bg, color, isMobile = false) {
  return {
    border: 'none',
    borderRadius: 999,
    padding: isMobile ? '6px 8px' : '7px 12px',
    fontSize: isMobile ? 10 : 12,
    fontWeight: 600,
    background: bg,
    color,
    cursor: 'pointer',
    flex: isMobile ? '0 0 auto' : 1,
    minWidth: isMobile ? 42 : 'auto',
  };
}
