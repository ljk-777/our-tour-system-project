import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getSpots, getDiaries, deleteDiary, deleteSpot } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Admin() {
  const { user, isLoggedIn } = useAuth();
  const [stats, setStats] = useState({ users: 0, spots: 0, diaries: 0 });
  const [users, setUsers] = useState([]);
  const [spots, setSpots] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, spotsRes, diariesRes] = await Promise.all([
        getUsers(),
        getSpots({ limit: 50 }),
        getDiaries({ limit: 20 }),
      ]);
      setUsers(usersRes.data.data || []);
      setSpots(spotsRes.data.data || []);
      setDiaries(diariesRes.data.data || []);
      setStats({
        users: (usersRes.data.data || []).length,
        spots: spotsRes.data.total || (spotsRes.data.data || []).length,
        diaries: diariesRes.data.total || (diariesRes.data.data || []).length,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiary = async (id) => {
    if (!window.confirm('确定删除这篇日记？')) return;
    await deleteDiary(id);
    setDiaries(prev => prev.filter(d => d.id !== id));
    setStats(prev => ({ ...prev, diaries: prev.diaries - 1 }));
  };

  const handleDeleteSpot = async (id) => {
    if (!window.confirm('确定删除这个景点？')) return;
    await deleteSpot(id);
    setSpots(prev => prev.filter(s => s.id !== id));
    setStats(prev => ({ ...prev, spots: prev.spots - 1 }));
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
  };

  const tabStyle = (active) => ({
    background: active ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
    color: active ? '#38bdf8' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${active ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.06)'}`,
  });

  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>需要登录</h2>
        <p className="mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>请先登录以访问管理后台</p>
        <Link to="/auth" className="btn-primary">登录 / 注册</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>🔧 管理后台</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>系统数据管理与监控</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '用户总数', value: stats.users, icon: '👥', iconBg: 'rgba(59,130,246,0.15)' },
          { label: '景点总数', value: stats.spots, icon: '🗺️', iconBg: 'rgba(34,197,94,0.15)' },
          { label: '日记总数', value: stats.diaries, icon: '📖', iconBg: 'rgba(168,85,247,0.15)' },
        ].map(item => (
          <div key={item.label} className="p-5 flex items-center gap-4" style={cardStyle}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: item.iconBg }}>
              {item.icon}
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.value}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'overview', label: '📊 概览' },
          { key: 'users', label: '👥 用户管理' },
          { key: 'spots', label: '🗺️ 景点管理' },
          { key: 'diaries', label: '📖 日记管理' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={tabStyle(activeTab === tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* 概览 */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 最新用户 */}
              <div className="p-5" style={cardStyle}>
                <h3 className="font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>👥 最新用户</h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xl">{u.avatar}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{u.nickname}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{u.city} · {u.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最新日记 */}
              <div className="p-5" style={cardStyle}>
                <h3 className="font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>📖 最新日记</h3>
                <div className="space-y-3">
                  {diaries.slice(0, 5).map(d => (
                    <div key={d.id} className="py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{d.title}</div>
                      <div className="text-xs flex items-center gap-2 mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span>{d.userName}</span>
                        <span>·</span>
                        <span>❤️ {d.likes}</span>
                        <span>·</span>
                        <span>{d.createdAt?.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div className="overflow-hidden rounded-xl" style={cardStyle}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>城市</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>等级</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>日记</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>加入日期</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{u.avatar}</span>
                          <div>
                            <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{u.nickname}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{u.city || '-'}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{u.level}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{u.totalDiaries || 0}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{u.joinDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 景点管理 */}
          {activeTab === 'spots' && (
            <div className="overflow-hidden rounded-xl" style={cardStyle}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>城市</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>评分</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.name}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.type}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.city}</td>
                      <td className="px-4 py-3 text-sm text-yellow-400">⭐ {s.rating}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteSpot(s.id)}
                          className="text-xs text-red-400 hover:text-red-300">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 日记管理 */}
          {activeTab === 'diaries' && (
            <div className="overflow-hidden rounded-xl" style={cardStyle}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>作者</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>点赞</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {diaries.map(d => (
                    <tr key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="px-4 py-3 text-sm font-medium max-w-xs truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{d.title}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.userName}</td>
                      <td className="px-4 py-3 text-sm text-red-400">❤️ {d.likes}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.createdAt?.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteDiary(d.id)}
                          className="text-xs text-red-400 hover:text-red-300">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
