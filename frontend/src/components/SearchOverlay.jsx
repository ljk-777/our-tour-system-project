import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { autocompleteSpots } from '../api/index.js';

/**
 * SearchOverlay — 全屏搜索覆盖层
 *
 * 在 Explore 页面点击搜索按钮后弹出。
 * 提供景点名称自动补全（调用 Trie 接口）。
 *
 * 升级路线:
 *   Phase 2: 可扩展支持搜索城市 / 日记 / 用户
 *   Phase 3: 结合地图，点击结果直接飞到地球上的位置
 *
 * @param {function} onClose  关闭覆盖层的回调
 */
export default function SearchOverlay({ onClose }) {
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(false);
  const inputRef                = useRef(null);
  const navigate                = useNavigate();

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC 关闭
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // 自动补全（防抖 300ms）
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const tid = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await autocompleteSpots(q);
        setResults(res.data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(tid);
  }, [q]);

  const goToSpot = (spot) => {
    onClose();
    navigate(`/spots/${spot.id}`);
  };

  const goToSearch = () => {
    onClose();
    navigate(`/spots?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
    {/* 背景遮罩 */}
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(2,8,30,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl px-4 animate-slide-up">
        {/* 搜索框 */}
        <div className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-5 py-4 mb-4"
          style={{
            transform: focused ? 'scale(1.025)' : 'scale(1)',
            boxShadow: focused ? '0 24px 64px rgba(0,0,0,0.70)' : '0 8px 32px rgba(0,0,0,0.45)',
            transition: 'transform 0.30s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.30s ease',
          }}>
          <span className="text-sky-400 text-xl" style={{ transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)', transform: focused ? 'scale(1.20)' : 'scale(1)' }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && q && goToSearch()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="搜索景区、城市、高校..."
            className="flex-1 bg-transparent text-white text-lg placeholder-white/25 outline-none"
          />
          {loading && (
            <span className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          )}
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-sm transition-colors">
            ESC
          </button>
        </div>

        {/* 算法说明 */}
        <div className="text-xs text-sky-400/40 text-center mb-3 font-mono">
          算法: Trie 前缀树自动补全 · 编辑距离模糊匹配
        </div>

        {/* 搜索结果 */}
        {results.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            style={{ animation: 'searchResultsIn 0.28s cubic-bezier(0.16,1,0.3,1) both', transformOrigin: 'top' }}>
            {results.slice(0, 8).map((spot, i) => (
              <button
                key={spot.id}
                onClick={() => goToSpot(spot)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/8 transition-colors ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <span className="text-xl w-8 text-center">
                  {spot.type === 'scenic' ? '🏛️' : spot.type === 'campus' ? '🎓' : spot.type === 'pku_building' ? '🏫' : '📍'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{spot.name}</div>
                  <div className="text-white/40 text-xs">{spot.city} · {spot.type}</div>
                </div>
                <span className="text-yellow-400 text-xs">⭐ {spot.rating}</span>
              </button>
            ))}
            {q && (
              <button
                onClick={goToSearch}
                className="w-full flex items-center gap-3 px-5 py-3 border-t border-white/5 hover:bg-white/8 transition-colors text-sky-400 text-sm"
              >
                <span>🔎</span>
                <span>查看 "{q}" 的全部结果 →</span>
              </button>
            )}
          </div>
        )}

        {/* 快捷入口（无关键词时） */}
        {!q && (
          <div className="grid grid-cols-4 gap-3 mt-2">
            {['北京','上海','杭州','成都','西安','云南','北大','故宫'].map((kw, i) => (
              <button
                key={kw}
                onClick={() => setQ(kw)}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/60 hover:text-white text-sm transition-all"
                style={{ animation: `popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both` }}
              >
                {kw}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    <style>{`
      @keyframes searchResultsIn {
        from { opacity: 0; transform: scaleY(0.88) translateY(-8px); }
        to   { opacity: 1; transform: scaleY(1) translateY(0); }
      }
    `}</style>
    </>
  );
}
