import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getUserById, getDiaries } from '../api/index.js';

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

function UserCard({ user, selected, onClick }) {
  const lvl = LEVEL_CONFIG[user.level] || LEVEL_CONFIG['旅行新手'];
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
        selected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
      }`}>
      <div className="relative shrink-0">
        <span className="text-3xl w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl">{user.avatar}</span>
        <span className="absolute -bottom-1 -right-1 text-xs">{lvl.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{user.nickname}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${lvl.color}`}>{user.level}</span>
          <span className="text-xs text-gray-400">{CITY_ICON[user.city] || '📍'} {user.city}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold text-blue-600">{user.totalSpots}</div>
        <div className="text-xs text-gray-400">景点</div>
      </div>
    </button>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Profile() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    getUsers().then(res => {
      const list = res.data.data || [];
      setUsers(list);
      if (list[0]) loadUser(list[0]);
    }).finally(() => setLoading(false));
  }, []);

  const loadUser = async (user) => {
    const res = await getUserById(user.id);
    setSelected(res.data.data);
    setTab('overview');
    getDiaries({ userId: user.id }).then(r => setDiaries(r.data.data || []));
  };

  // Sort users by totalSpots desc for leaderboard
  const sorted = [...users].sort((a, b) => (b.totalSpots || 0) - (a.totalSpots || 0));
  const maxSpots = sorted[0]?.totalSpots || 1;
  const maxDiaries = Math.max(...users.map(u => u.totalDiaries || 0), 1);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="text-4xl animate-float">👥</div>
    </div>
  );

  const lvl = selected ? (LEVEL_CONFIG[selected.level] || LEVEL_CONFIG['旅行新手']) : null;
  const joinDays = selected ? Math.floor((Date.now() - new Date(selected.joinDate)) / 86400000) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="section-title">旅行者社区</h1>
        <p className="section-sub">共 {users.length} 位旅行者 · 按探访景点数排名</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左侧：用户列表 */}
        <div className="space-y-4">
          {/* 排行榜 Top 3 */}
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1">
              🏆 探访排行榜
            </div>
            <div className="space-y-1">
              {sorted.slice(0, 3).map((u, i) => (
                <div key={u.id} className="flex items-center gap-2 py-1">
                  <span className={`text-sm font-bold w-5 text-center ${
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-700'
                  }`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span className="text-xl">{u.avatar}</span>
                  <span className="text-sm font-medium text-gray-800 flex-1 truncate">{u.nickname}</span>
                  <span className="text-xs font-bold text-blue-600">{u.totalSpots} 景</span>
                </div>
              ))}
            </div>
          </div>

          {/* 全部用户 */}
          <div className="card p-3">
            <div className="text-xs font-semibold text-gray-500 mb-2 px-1">所有旅行者</div>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {users.map(u => (
                <UserCard key={u.id} user={u} selected={selected?.id === u.id} onClick={() => loadUser(u)} />
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：用户详情 */}
        {selected && (
          <div className="md:col-span-2 space-y-4">
            {/* 个人卡片 */}
            <div className="card overflow-hidden">
              {/* Banner */}
              <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-8 mb-3">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-4xl border-2 border-white">
                    {selected.avatar}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${lvl.color}`}>
                    {lvl.icon} {selected.level}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selected.nickname}</h2>
                <p className="text-sm text-gray-400 mb-1">@{selected.username} · {CITY_ICON[selected.city] || '📍'} {selected.city}</p>
                <p className="text-sm text-gray-600 mb-4">{selected.bio}</p>

                {/* 统计数字 */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: '📝', value: selected.totalDiaries, label: '日记' },
                    { icon: '🗺️', value: selected.totalSpots,   label: '景点' },
                    { icon: '📅', value: joinDays,              label: '旅行天' },
                    { icon: '❤️', value: diaries.reduce((s, d) => s + (d.likes || 0), 0), label: '获赞' },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-gray-50 rounded-xl py-3">
                      <div className="text-lg">{s.icon}</div>
                      <div className="text-lg font-bold text-blue-600 leading-tight">{s.value}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab 切换 */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-gray-100">
                {[['overview','数据概览'],['diaries','TA的日记']].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`px-5 py-3 text-sm font-medium transition-colors ${
                      tab === k ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}>{l}
                    {k === 'diaries' && diaries.length > 0 && (
                      <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{diaries.length}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === 'overview' && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-3">与其他旅行者对比</div>
                      <div className="space-y-3">
                        <StatBar label="探访景点" value={selected.totalSpots} max={maxSpots} color="bg-blue-400" />
                        <StatBar label="日记数量" value={selected.totalDiaries} max={maxDiaries} color="bg-purple-400" />
                        <StatBar label="旅行天数" value={joinDays} max={Math.max(...users.map(u => Math.floor((Date.now() - new Date(u.joinDate)) / 86400000)), 1)} color="bg-green-400" />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-3">旅行者成就</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { icon: '🗺️', label: '探路先锋', desc: `探访 ${selected.totalSpots} 处`, unlocked: selected.totalSpots >= 10 },
                          { icon: '📝', label: '日记达人', desc: `写了 ${selected.totalDiaries} 篇`, unlocked: selected.totalDiaries >= 5 },
                          { icon: '📅', label: '资深老友', desc: `加入 ${joinDays} 天`,           unlocked: joinDays >= 180 },
                          { icon: '🌟', label: '百景勇士', desc: '探访100+景点',                  unlocked: selected.totalSpots >= 100 },
                          { icon: '✍️', label: '勤奋写手', desc: '写了20+篇日记',                  unlocked: selected.totalDiaries >= 20 },
                          { icon: '🏙️', label: '城市漫游',  desc: '来自'+selected.city,            unlocked: true },
                        ].map(a => (
                          <div key={a.label} className={`rounded-xl p-3 text-center border transition-all ${
                            a.unlocked ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'
                          }`}>
                            <div className="text-2xl mb-1">{a.icon}</div>
                            <div className="text-xs font-semibold text-gray-800">{a.label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-sm">
                      <div className="font-medium text-gray-700 mb-2">基本资料</div>
                      <div className="space-y-1.5 text-gray-600">
                        <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">邮箱</span><span>{selected.email}</span></div>
                        <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">所在城市</span><span>{selected.city}</span></div>
                        <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">加入时间</span><span>{selected.joinDate}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'diaries' && (
                  <div>
                    {diaries.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <div className="text-4xl mb-2">📖</div>
                        <p className="text-sm">TA 还没有写日记</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {diaries.map(d => (
                          <div key={d.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-100 transition-colors">
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
                          前往日记社区查看更多 →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
