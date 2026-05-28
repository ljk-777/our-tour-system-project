import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, createGroup, joinGroup } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const loadGroups = () => {
    setLoading(true);
    getGroups().then(r => setGroups(r.data?.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadGroups(); }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true); setError('');
    try {
      await createGroup({ name: groupName.trim() });
      setShowCreate(false); setGroupName('');
      loadGroups();
    } catch (err) { setError(err?.response?.data?.message || '创建失败'); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true); setError('');
    try {
      await joinGroup({ code: joinCode.trim() });
      setShowJoin(false); setJoinCode('');
      loadGroups();
    } catch (err) { setError(err?.response?.data?.message || '加入失败'); }
    finally { setJoining(false); }
  };

  if (!user) return (
    <div className="glass-bg min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-gray-500">请先登录</p></div>
    </div>
  );

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的群组</h1>
            <p className="text-sm text-gray-500">创建或加入旅行群组，一起规划行程</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowJoin(true); setError(''); }}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">加入群组</button>
            <button onClick={() => { setShowCreate(true); setError(''); }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700">创建群组</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-2xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">创建群组</h2>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="群组名称" autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
                <button onClick={handleCreate} disabled={creating || !groupName.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join modal */}
        {showJoin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowJoin(false)}>
            <div className="bg-white rounded-2xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">加入群组</h2>
              <p className="text-xs text-gray-500 mb-3">输入群组管理员分享的6位加入码</p>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="输入加入码" maxLength={6} autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase tracking-widest"
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
                <button onClick={handleJoin} disabled={joining || joinCode.length < 6}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {joining ? '加入中...' : '加入'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group list */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-sm">还没有加入任何群组</p>
            <p className="text-xs text-gray-300 mt-1">创建一个或输入群组码加入</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <Link key={g.id} to={`/groups/${g.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{g.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">码: {g.code} · {g.memberCount} 人</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {g.lastMessage && <p className="max-w-40 truncate">{g.lastMessage}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
