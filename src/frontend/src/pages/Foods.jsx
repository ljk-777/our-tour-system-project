import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownUp,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Soup,
  Star,
  Utensils,
} from 'lucide-react';
import { getSpots, recommendFoods, searchFoods } from '../api/index.js';

const CUISINES = ['全部', '北京菜', '北京烤鸭', '火锅', '清真', '小吃', '老字号', '川菜', '粤菜', '杭帮菜'];

const SORT_OPTIONS = [
  { key: 'popularity', label: '热度', icon: SlidersHorizontal },
  { key: 'rating', label: '评价', icon: Star },
  { key: 'distance', label: '距离', icon: Navigation },
];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1800&q=85',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1800&q=85',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1800&q=85',
];

function getOriginLabel(origin) {
  return `${origin.name}${origin.city ? ` · ${origin.city}` : ''}`;
}

function getTypeText(type) {
  if (type === 'campus') return '学校';
  if (type === 'scenic') return '景点';
  return '地点';
}

function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return '未选地点';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function getAmapUrl(food) {
  if (!food?.lat || !food?.lng) return '#';
  return `https://uri.amap.com/marker?position=${food.lng},${food.lat}&name=${encodeURIComponent(food.name)}`;
}

export default function Foods() {
  const [origins, setOrigins] = useState([]);
  const [originQuery, setOriginQuery] = useState('');
  const [selectedOriginIds, setSelectedOriginIds] = useState([]);
  const [cuisine, setCuisine] = useState('全部');
  const [sortBy, setSortBy] = useState('popularity');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [originLoading, setOriginLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setHeroIndex((index) => (index + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadOrigins() {
      setOriginLoading(true);
      try {
        const res = await getSpots({ limit: 500, offset: 0 });
        const list = (res.data.data || [])
          .filter((spot) => ['scenic', 'campus'].includes(spot.type) && spot.lat && spot.lng)
          .slice(0, 220);
        if (mounted) {
          setOrigins(list);
          setSelectedOriginIds([]);
        }
      } catch {
        if (mounted) setOrigins([]);
      } finally {
        if (mounted) setOriginLoading(false);
      }
    }
    loadOrigins();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadFoods();
  }, [selectedOriginIds, cuisine, sortBy]);

  const selectedOrigins = useMemo(
    () => origins.filter((origin) => selectedOriginIds.includes(origin.id)),
    [origins, selectedOriginIds]
  );

  const filteredOrigins = useMemo(() => {
    const text = originQuery.trim().toLowerCase();
    const base = text
      ? origins.filter((origin) =>
          `${origin.name} ${origin.city} ${getTypeText(origin.type)}`.toLowerCase().includes(text)
        )
      : origins;
    return base.slice(0, 24);
  }, [originQuery, origins]);

  async function loadFoods(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const params = {
        originIds: selectedOriginIds.join(','),
        cuisine: cuisine === '全部' ? '' : cuisine,
        sortBy,
        limit: 10,
        includeAll: true,
      };
      const res = nextQuery.trim()
        ? await searchFoods({ ...params, q: nextQuery.trim() })
        : await recommendFoods(params);
      setFoods(res.data.data || []);
      setVisibleCount(10);
      setMeta(res.data);
    } catch {
      setFoods([]);
      setMeta(null);
      setError('美食推荐暂时不可用');
    } finally {
      setLoading(false);
    }
  }

  function toggleOrigin(id) {
    setSelectedOriginIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-4)
    );
  }

  function handleSearch(event) {
    event.preventDefault();
    setVisibleCount(10);
    loadFoods(query);
  }

  const visibleFoods = foods.slice(0, visibleCount);
  const hasMoreFoods = visibleCount < foods.length;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fb', paddingBottom: 72 }}>
      <section style={{ position: 'relative', minHeight: 330, overflow: 'hidden' }}>
        {HERO_IMAGES.map((image, index) => (
          <div
            key={image}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: index === heroIndex ? 1 : 0,
              transition: 'opacity 1.2s ease',
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,18,28,0.58)' }} />
        <div
          style={{
            position: 'relative',
            maxWidth: 1180,
            margin: '0 auto',
            padding: '84px 24px 40px',
            color: '#fff',
          }}
        >
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <Utensils size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>FOOD TOP 10</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.1rem, 6vw, 4rem)', lineHeight: 1.04, fontWeight: 900, margin: 0 }}>
            美食推荐
          </h1>
          <p style={{ maxWidth: 620, marginTop: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>
            选择游览景点或学校后，按热度、评价、距离筛出前 10 家餐厅，更多结果继续保持同一排序。
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 1180, margin: '-44px auto 0', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <section
          style={{
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 8,
            boxShadow: '0 14px 38px rgba(15,23,42,0.12)',
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(220px,0.7fr)', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#0f172a', fontWeight: 800 }}>
                <MapPin size={18} />
                选择游览景点 / 学校
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #d8dee9', borderRadius: 8, padding: '9px 12px', marginBottom: 10 }}>
                <Search size={16} color="#64748b" />
                <input
                  value={originQuery}
                  onChange={(event) => setOriginQuery(event.target.value)}
                  placeholder="搜索景点、学校、城市..."
                  style={{ border: 0, outline: 0, flex: 1, fontSize: 14, background: 'transparent' }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 116, overflow: 'auto' }}>
                {originLoading ? (
                  <span style={{ color: '#64748b', fontSize: 13 }}>加载地点中...</span>
                ) : (
                  filteredOrigins.map((origin) => {
                    const active = selectedOriginIds.includes(origin.id);
                    return (
                      <button
                        key={origin.id}
                        onClick={() => toggleOrigin(origin.id)}
                        style={{
                          border: `1px solid ${active ? '#2563eb' : '#d8dee9'}`,
                          background: active ? '#eff6ff' : '#fff',
                          color: active ? '#1d4ed8' : '#334155',
                          borderRadius: 8,
                          padding: '7px 10px',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        {getOriginLabel(origin)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>已选地点</div>
              {selectedOrigins.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>默认不选地点；距离排序会按未选地点处理</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedOrigins.map((origin) => (
                    <div key={origin.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>{origin.name}</span>
                      <span style={{ color: '#64748b' }}>{getTypeText(origin.type)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto',
            gap: 14,
            alignItems: 'start',
            marginBottom: 18,
          }}
        >
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}>
              <Search size={18} color="#64748b" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入烤鸭、火锅、聚宝源、窗口名称..."
                style={{ border: 0, outline: 0, flex: 1, fontSize: 14 }}
              />
            </div>
            <button
              type="submit"
              style={{
                border: 0,
                background: '#f97316',
                color: '#fff',
                borderRadius: 8,
                padding: '0 16px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              搜索
            </button>
          </form>

          <button
            onClick={() => {
              setQuery('');
              loadFoods('');
            }}
            style={{
              border: '1px solid #d8dee9',
              background: '#fff',
              color: '#334155',
              borderRadius: 8,
              padding: '12px 16px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            推荐
          </button>
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = sortBy === key;
            return (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  border: `1px solid ${active ? '#2563eb' : '#d8dee9'}`,
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#1d4ed8' : '#334155',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, marginLeft: 4 }}>
            <ArrowDownUp size={15} />
            MinHeap TopK
          </span>
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CUISINES.map((item) => {
            const active = cuisine === item;
            return (
              <button
                key={item}
                onClick={() => setCuisine(item)}
                style={{
                  border: `1px solid ${active ? '#f97316' : '#d8dee9'}`,
                  background: active ? '#fff7ed' : '#fff',
                  color: active ? '#ea580c' : '#475569',
                  borderRadius: 8,
                  padding: '7px 11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            );
          })}
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, color: '#64748b', fontSize: 13 }}>
          <span>{meta?.algorithm || 'MinHeap TopK O(N log K)'}</span>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, index) => (
              <div key={index} style={{ height: 290, borderRadius: 8, background: '#e2e8f0' }} />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0', color: '#64748b' }}>
            <Soup size={44} strokeWidth={1.6} />
            <div style={{ marginTop: 12, fontWeight: 800 }}>没有匹配的餐厅</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {visibleFoods.map((food) => (
              <article
                key={food.id}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 8px 22px rgba(15,23,42,0.06)',
                }}
              >
                <Link to={`/spots/${food.id}`} style={{ display: 'block', height: 156, background: '#111827', position: 'relative', overflow: 'hidden' }}>
                  {food.imageUrl && (
                    <img
                      src={food.imageUrl}
                      alt={food.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.56), transparent 60%)' }} />
                  <div style={{ position: 'absolute', left: 12, bottom: 10, color: '#fff', fontWeight: 900 }}>
                    {food.isTopRecommendation ? `#${food.topRank}` : '候选'}
                  </div>
                  <div style={{ position: 'absolute', right: 10, bottom: 10, color: '#fbbf24', fontWeight: 900 }}>
                    {Number(food.rating || 0).toFixed(1)}
                  </div>
                </Link>

                <div style={{ padding: 14 }}>
                  <Link to={`/spots/${food.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                    <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.35, fontWeight: 900 }}>{food.name}</h3>
                  </Link>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, color: '#64748b', fontSize: 13 }}>
                    <span>{formatDistance(food.distanceKm)}</span>
                    <span>热度 {Math.round(food.popularityScore || 0)}</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, minHeight: 42, margin: '10px 0 12px' }}>
                    {food.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {(food.tags || []).slice(0, 4).map((tag) => (
                      <span key={tag} style={{ background: '#fff7ed', color: '#ea580c', borderRadius: 6, padding: '3px 7px', fontSize: 12, fontWeight: 800 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {food.openHours || '营业时间以门店为准'}
                    </span>
                    <a
                      href={getAmapUrl(food)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563eb', fontSize: 13, fontWeight: 900, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      高德
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && hasMoreFoods && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button
              onClick={() => setVisibleCount((count) => Math.min(count + 10, foods.length))}
              style={{
                border: '1px solid #d8dee9',
                background: '#fff',
                color: '#0f172a',
                borderRadius: 8,
                padding: '11px 22px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
              }}
            >
              更多
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
