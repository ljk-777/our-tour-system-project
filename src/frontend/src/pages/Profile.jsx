import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getUserById, getDiaries, getUserFavorites, getUserFootprint } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

const LEVEL_CONFIG = {
  '旅行新手':    { color: 'bg-gray-100 text-gray-600',   icon: '🌱', rank: 1 },
  '旅行达人':    { color: 'bg-blue-100 text-blue-700',   icon: '⭐', rank: 2 },
  '资深旅行者':  { color: 'bg-purple-100 text-purple-700', icon: '🌟', rank: 3 },
  '探险家':      { color: 'bg-orange-100 text-orange-700', icon: '🏆', rank: 4 },
  '美食家':      { color: 'bg-red-100 text-red-700',     icon: '🍜', rank: 3 },
  '文化学者':    { color: 'bg-amber-100 text-amber-700', icon: '📚', rank: 3 },
  '尊享会员':    { color: 'bg-yellow-100 text-yellow-700', icon: '💎', rank: 4 },
  '超级管理员':  { color: 'bg-slate-100 text-slate-700', icon: '⚙️', rank: 5 },
};

const CITY_ICON = { 北京:'🏛️', 上海:'🌆', 成都:'🐼', 杭州:'🌸', 云南:'🏔️', 西安:'🏯', 广州:'🌸', 武汉:'🌉' };

export default function Profile() {
  const { id: urlUserId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', city: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [footprint, setFootprint] = useState(null);   // { cities, stats }
  const { toggle: toggleFav, isFavorited } = useFavorites();

  const targetUserId = urlUserId || user?.id;

  useEffect(() => {
    if (!targetUserId) { setLoading(false); return; }
    Promise.all([
      getUserById(targetUserId).then(r => {
        const p = r.data.data;
        setProfile(p);
        if (String(targetUserId) === String(user?.id))
          setEditForm({ nickname: p.nickname || '', city: p.city || '', bio: p.bio || '' });
      }),
      getDiaries({ userId: targetUserId }).then(r => setDiaries(r.data.data || [])),
      getUserFavorites(targetUserId).then(r => setFavorites(r.data.data || [])),
      getUserFootprint(targetUserId).then(r => setFootprint(r.data.data || null)),
    ]).catch(() => { setProfile(null); }).finally(() => setLoading(false));
  }, [targetUserId, user?.id]);

  const [saveMsg, setSaveMsg] = useState('');

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await api.put(`/users/${profile.id}`, editForm);
      if (res.data.success) {
        setProfile(prev => ({ ...prev, ...editForm }));
        setEditing(false);
        setSaveMsg('ok');
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } catch (err) {
      setSaveMsg(err?.response?.data?.message || '保存失败，请重试');
    } finally { setSaving(false); }
  };

  const isViewingOwnProfile = !urlUserId || String(urlUserId) === String(user?.id);
  if (!user && !urlUserId) return (
    <div className="glass-bg" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">👤</div>
        <p className="text-gray-500 font-medium mb-4">请先登录以查看个人主页</p>
        <Link to="/auth" className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}> 去登录 </Link>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center items-center py-20"><div className="text-4xl animate-float">👤</div></div>
  );

  if (!profile) return (
    <div className="text-center py-20 text-gray-400"><div className="text-4xl mb-2">😕</div><p>未找到用户信息</p></div>
  );

  const lvl = LEVEL_CONFIG[profile.level] || LEVEL_CONFIG['旅行新手'];
  const joinTs = profile.joinDate ? new Date(profile.joinDate).getTime() : null;
  const joinDays = joinTs && !isNaN(joinTs) ? Math.floor((Date.now() - joinTs) / 86400000) : 0;

  return (
    <div className="glass-bg">
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 个人卡片 */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center text-5xl border-2 border-white relative">
              {profile.avatar}
            </div>
            <div className="flex gap-2">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${lvl.color}`}>{lvl.icon} {profile.level}</span>
              {isViewingOwnProfile && (
                <button onClick={() => setEditing(!editing)}
                  className="text-sm px-3 py-1 rounded-full border transition-colors"
                  style={editing
                    ? { borderColor: '#f97316', color: '#f97316', background: 'rgba(249,115,22,0.06)' }
                    : { borderColor: '#d1d5db', color: '#6b7280' }}>
                  {editing ? '取消' : '编辑资料'}
                </button>
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile.nickname}</h2>
          <p className="text-sm text-gray-400 mb-1">@{profile.username} · {CITY_ICON[profile.city] || '📍'} {profile.city}</p>
          <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>

          {/* 统计数字 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: '📝', value: profile.totalDiaries, label: '日记' },
              { icon: '🗺️', value: profile.totalSpots,  label: '景点' },
              { icon: '📅', value: joinDays,             label: '在站天' },
              { icon: '❤️', value: diaries.reduce((s, d) => s + (d.likes || 0), 0), label: '获赞' },
            ].map(s => (
              <div key={s.label} className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.75)' }}>
                <div className="text-lg">{s.icon}</div>
                <div className="text-lg font-bold leading-tight" style={{ color: '#f97316' }}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 编辑资料表单 */}
      {editing && (
        <div className="glass-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">编辑资料</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">昵称</label>
              <input value={editForm.nickname} onChange={e => setEditForm(f => ({...f, nickname: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">城市</label>
              <input value={editForm.city} onChange={e => setEditForm(f => ({...f, city: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">个人简介</label>
              <textarea value={editForm.bio} onChange={e => setEditForm(f => ({...f, bio: e.target.value}))} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                {saving ? '保存中...' : '保存'}
              </button>
              {saveMsg === 'ok' && <span className="text-sm text-green-600 font-medium">✓ 保存成功</span>}
              {saveMsg && saveMsg !== 'ok' && <span className="text-sm text-red-500">{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {[
            ['overview', '数据概览', null],
            ['footprint', '旅行足迹', footprint?.stats?.totalCities || null],
            ['favorites', '我的收藏', favorites.length || null],
            ['diaries',  '我的日记', diaries.length || null],
            ['info',     '基本资料', null],
          ].map(([k, l, badge]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${tab === k ? 'border-b-2' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === k ? { color: '#f97316', borderColor: '#f97316' } : {}}>{l}
              {badge > 0 && (
                <span className="ml-1.5 bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* 成就 */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">我的成就</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: '🗺️', label: '探路先锋', desc: `探访 ${profile.totalSpots} 处`, unlocked: profile.totalSpots >= 10 },
                    { icon: '📝', label: '日记达人', desc: `写了 ${profile.totalDiaries} 篇`, unlocked: profile.totalDiaries >= 5 },
                    { icon: '📅', label: '资深老友', desc: `加入 ${joinDays} 天`, unlocked: joinDays >= 180 },
                    { icon: '🌟', label: '百景勇士', desc: '探访100+景点', unlocked: profile.totalSpots >= 100 },
                    { icon: '✍️', label: '勤奋写手', desc: '写了20+篇日记', unlocked: profile.totalDiaries >= 20 },
                    { icon: '🏙️', label: '城市漫游', desc: `来自${profile.city}`, unlocked: true },
                  ].map(a => (
                    <div key={a.label} className="rounded-xl p-3 text-center transition-all"
                      style={a.unlocked
                        ? { background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                        : { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', opacity: 0.4, filter: 'grayscale(1)' }}>
                      <div className="text-2xl mb-1">{a.icon}</div>
                      <div className="text-xs font-semibold text-gray-800">{a.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'footprint' && (
            <div>
              {/* 统计数字 */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { icon: '🏙️', value: footprint?.stats?.totalCities     || 0, label: '城市' },
                  { icon: '🗺️', value: footprint?.stats?.totalProvinces  || 0, label: '省份' },
                  { icon: '📍', value: footprint?.stats?.totalSpots       || 0, label: '景点' },
                  { icon: '📝', value: footprint?.stats?.totalDiaries     || 0, label: '日记' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-3"
                    style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <div className="text-xl">{s.icon}</div>
                    <div className="text-lg font-bold leading-tight" style={{ color: '#f97316' }}>{s.value}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* 足迹城市列表 */}
              {(!footprint?.cities || footprint.cities.length === 0) ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🌍</div>
                  <p className="text-sm">还没有旅行记录，快去写第一篇日记吧！</p>
                  <Link to="/diary" className="inline-block mt-3 text-sm text-orange-500 hover:underline">去写日记 →</Link>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-gray-400 mb-3">按访问次数排序，数据来自旅行日记</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {footprint.cities.map((c, i) => (
                      <div key={c.city} className="rounded-xl p-3 flex items-center gap-3 transition-all"
                        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'rgba(249,115,22,0.12)', color: i < 3 ? '#fff' : '#f97316' }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800 truncate">{c.city}</div>
                          <div className="text-xs text-gray-400 truncate">{c.province}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold" style={{ color: '#f97316' }}>{c.visitCount}</div>
                          <div className="text-xs text-gray-400">次</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🤍</div>
                  <p className="text-sm">还没有收藏景点</p>
                  <Link to="/spots" className="inline-block mt-3 text-sm text-orange-500 hover:underline">去发现景点 →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map(s => (
                    <div key={s.id} className="glass-card p-4 flex items-center gap-4" style={{ borderRadius: 14 }}>
                      {/* 图片 or 占位 */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl">
                        {s.imageUrl
                          ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/spots/${s.id}`} className="font-semibold text-gray-900 text-sm hover:text-orange-500 transition-colors block truncate">{s.name}</Link>
                        <div className="text-xs text-gray-400 mt-0.5">📍 {s.city} · {s.type}</div>
                        {s.rating > 0 && <div className="text-xs text-amber-500 mt-0.5">{'★'.repeat(Math.round(s.rating))} {s.rating}</div>}
                        {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.description}</p>}
                      </div>
                      <button
                        onClick={() => { toggleFav(s.id); setFavorites(prev => prev.filter(f => f.id !== s.id)); }}
                        title="取消收藏"
                        className="flex-shrink-0 text-lg hover:scale-110 transition-transform"
                      >
                        ❤️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'diaries' && (
            <div>
              {diaries.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">📖</div>
                  <p className="text-sm">你还没有写日记</p>
                  <Link to="/diary" className="inline-block mt-3 text-sm text-blue-500 hover:underline">去写第一篇 →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {diaries.map(d => (
                    <div key={d.id} className="glass-card p-4" style={{ borderRadius: 14 }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{d.title}</h4>
                        <div className="text-yellow-500 text-xs shrink-0">{'⭐'.repeat(d.rating || 5)}</div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {d.spotName && `📍 ${d.spotName} · `}{d.visitDate} · {d.weather} · {d.mood}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{d.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>❤️ {d.likes}</span>
                        <span>💬 {Array.isArray(d.comments) ? d.comments.length : (d.comments || 0)}</span>
                        <span>👁️ {d.views}</span>
                        {(d.tags || []).slice(0, 3).map(t => (
                          <Link key={t} to={`/spots?q=${t}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 hover:text-blue-600">#{t}</Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Link to="/diary" className="block text-center text-sm text-blue-500 hover:underline pt-2">
                    查看全部日记 →
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === 'info' && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.75)' }}>
              <div className="font-medium text-gray-700 mb-2">基本资料</div>
              <div className="space-y-1.5 text-gray-600">
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">邮箱</span><span>{profile.email}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">用户名</span><span>@{profile.username}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">所在城市</span><span>{profile.city}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">等级</span><span>{lvl.icon} {profile.level}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">加入时间</span><span>{profile.joinDate}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
