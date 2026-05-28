import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroup, getTrip, saveTrip, getMessages, sendMessage, deleteGroup } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [trip, setTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    const [gRes, tRes, mRes] = await Promise.all([
      getGroup(id).catch(() => ({ data: { data: null } })),
      getTrip(id).catch(() => ({ data: { data: null } })),
      getMessages(id, {}).catch(() => ({ data: { data: [] } })),
    ]);
    if (gRes.data?.data) setGroup(gRes.data.data);
    if (tRes.data?.data) setTrip(tRes.data.data);
    if (mRes.data?.data) {
      const msgs = mRes.data.data;
      setMessages(prev => {
        if (prev.length === 0) return msgs;
        if (msgs.length > prev.length) return msgs;
        return prev;
      });
    }
  }, [id]);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);

  // Auto-poll every 10s
  useEffect(() => {
    const timer = setInterval(loadAll, 10000);
    return () => clearInterval(timer);
  }, [loadAll]);

  // Scroll chat to bottom only when user is near bottom
  useEffect(() => {
    if (tab !== 'chat') return;
    const el = chatScrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;  // Direct scroll on container only — no page scroll
    }
  }, [messages, tab]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await sendMessage(id, { content: messageText.trim() });
      setMessageText('');
      const mRes = await getMessages(id, {});
      if (mRes.data?.data) setMessages(mRes.data.data);
    } catch {} finally { setSending(false); }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(id);
      window.location.href = '/groups';
    } catch (err) { alert(err?.response?.data?.message || '删除失败'); }
    setShowDelete(false);
  };

  // ── Trip editor ──
  const [editTrip, setEditTrip] = useState(null);
  const [editing, setEditing] = useState(false);

  const openEditor = () => {
    setEditTrip(trip || { destination: '', dailyPlan: [] });
    setEditing(true);
  };

  const handleSaveTrip = async () => {
    if (!editTrip?.destination) return;
    try {
      const res = await saveTrip(id, editTrip);
      if (res.data?.data) setTrip(res.data.data);
      setEditing(false);
    } catch (err) { alert(err?.response?.data?.message || '保存失败'); }
  };

  const addDay = () => {
    const dayNum = (editTrip.dailyPlan?.length || 0) + 1;
    setEditTrip(prev => ({ ...prev, dailyPlan: [...(prev.dailyPlan || []), { day: dayNum, date: '', activities: [] }] }));
  };

  const addActivity = (dayIdx) => {
    const plan = [...(editTrip.dailyPlan || [])];
    plan[dayIdx] = { ...plan[dayIdx], activities: [...(plan[dayIdx].activities || []), { type: '景点', name: '', description: '', time: '', cost: '' }] };
    setEditTrip(prev => ({ ...prev, dailyPlan: plan }));
  };

  const updateActivity = (dayIdx, actIdx, field, value) => {
    const plan = JSON.parse(JSON.stringify(editTrip.dailyPlan || []));
    plan[dayIdx].activities[actIdx][field] = value;
    setEditTrip(prev => ({ ...prev, dailyPlan: plan }));
  };

  const isAdmin = group?.members?.some(m => m.user.id === user?.id && m.role === 'admin');

  if (loading) return <div className="glass-bg min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⏳</div></div>;
  if (!group) return <div className="glass-bg min-h-screen flex items-center justify-center"><p className="text-gray-500">群组不存在</p></div>;

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to="/groups" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
              <p className="text-xs text-gray-400">加入码: <span className="font-mono tracking-widest">{group.code}</span></p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowDelete(true)} className="text-xs text-red-500 hover:text-red-700">删除群组</button>
          )}
        </div>

        {showDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDelete(false)}>
            <div className="bg-white rounded-2xl p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-sm mb-4">确定删除此群组？此操作不可撤销。</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-600">取消</button>
                <button onClick={handleDeleteGroup} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">删除</button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 mb-4">
          {[
            ['itinerary', '📋 行程'],
            ['chat', '💬 聊天'],
            ['members', '👥 成员'],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{label}</button>
          ))}
        </div>

        {/* Tab: Itinerary */}
        {tab === 'itinerary' && (
          <div>
            {editing ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">编辑行程</h3>
                <div className="space-y-3 mb-4">
                  <input value={editTrip.destination} onChange={e => setEditTrip(p => ({ ...p, destination: e.target.value }))} placeholder="* 目的地" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <input value={editTrip.departure || ''} onChange={e => setEditTrip(p => ({ ...p, departure: e.target.value }))} placeholder="出发地" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <input type="date" value={editTrip.startDate || ''} onChange={e => setEditTrip(p => ({ ...p, startDate: e.target.value }))} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <input type="date" value={editTrip.endDate || ''} onChange={e => setEditTrip(p => ({ ...p, endDate: e.target.value }))} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <input type="number" value={editTrip.budget || ''} onChange={e => setEditTrip(p => ({ ...p, budget: e.target.value }))} placeholder="预算" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <textarea value={editTrip.notes || ''} onChange={e => setEditTrip(p => ({ ...p, notes: e.target.value }))} placeholder="备注" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                {/* Daily plan */}
                <div className="space-y-3 mb-4">
                  {(editTrip.dailyPlan || []).map((day, di) => (
                    <div key={di} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-600">第 {day.day} 天</span>
                        <input type="date" value={day.date || ''} onChange={e => {
                          const plan = [...(editTrip.dailyPlan || [])];
                          plan[di] = { ...plan[di], date: e.target.value };
                          setEditTrip(p => ({ ...p, dailyPlan: plan }));
                        }} className="text-xs border border-gray-200 rounded px-2 py-1" />
                      </div>
                      {(day.activities || []).map((act, ai) => (
                        <div key={ai} className="flex items-center gap-1 mb-1 text-xs">
                          <select value={act.type} onChange={e => updateActivity(di, ai, 'type', e.target.value)} className="border border-gray-200 rounded px-1 py-1">
                            <option>景点</option><option>美食</option><option>交通</option><option>住宿</option>
                          </select>
                          <input value={act.name} onChange={e => updateActivity(di, ai, 'name', e.target.value)} placeholder="名称" className="flex-1 border border-gray-200 rounded px-2 py-1" />
                          <input value={act.cost} onChange={e => updateActivity(di, ai, 'cost', e.target.value)} placeholder="费用" className="w-16 border border-gray-200 rounded px-2 py-1" />
                        </div>
                      ))}
                      <button onClick={() => addActivity(di)} className="text-xs text-blue-500 hover:underline mt-1">+ 添加活动</button>
                    </div>
                  ))}
                  <button onClick={addDay} className="text-sm text-blue-500 hover:underline">+ 添加一天</button>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600">取消</button>
                  <button onClick={handleSaveTrip} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Trip view */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800">
                      {trip?.destination || '尚未创建行程'}
                    </h3>
                    <button onClick={openEditor} className="text-xs text-blue-600 hover:underline">
                      {trip ? '编辑行程' : '创建行程'}
                    </button>
                  </div>
                  {trip ? (
                    <div className="space-y-3 text-sm text-gray-600">
                      {trip.departure && <p>📍 出发地: {trip.departure}</p>}
                      <p>🎯 目的地: {trip.destination}</p>
                      {trip.startDate && <p>📅 {trip.startDate} ~ {trip.endDate || '未设置'}</p>}
                      {trip.budget && <p>💰 预算: ¥{Number(trip.budget).toLocaleString()}</p>}
                      {trip.notes && <p>📝 {trip.notes}</p>}
                      {trip.dailyPlan?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="font-medium text-gray-700">每日安排:</p>
                          {trip.dailyPlan.map((day, i) => (
                            <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <p className="text-xs font-bold text-gray-700 mb-1">第 {day.day} 天 {day.date ? `(${day.date})` : ''}</p>
                              {day.activities?.map((act, j) => (
                                <div key={j} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                                  <span>{act.type === '景点' ? '🏛️' : act.type === '美食' ? '🍜' : act.type === '交通' ? '🚗' : '🏨'}</span>
                                  <span className="font-medium">{act.name}</span>
                                  {act.cost && <span className="text-gray-400">¥{act.cost}</span>}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">点击"创建行程"开始规划</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Chat */}
        {tab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-[500px]">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id}>
                  {m.type === 'system' ? (
                    <div className="text-center text-xs text-gray-400 py-2">{m.content}</div>
                  ) : (
                    <div className={`flex gap-2 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xl shrink-0">{m.senderAvatar || '🧑'}</span>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${m.senderId === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {m.senderId !== user?.id && <p className="text-xs font-medium mb-0.5 opacity-70">{m.senderName}</p>}
                        <p>{m.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input value={messageText} onChange={e => setMessageText(e.target.value)}
                placeholder="输入消息..." maxLength={2000}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} />
              <button onClick={handleSend} disabled={sending || !messageText.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">{sending ? '...' : '发送'}</button>
            </div>
          </div>
        )}

        {/* Tab: Members */}
        {tab === 'members' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">群组加入码</p>
              <p className="text-lg font-mono tracking-widest text-blue-600 font-bold">{group.code}</p>
              <button onClick={() => { navigator.clipboard?.writeText(group.code); alert('已复制'); }}
                className="text-xs text-blue-500 hover:underline mt-1">复制</button>
            </div>
            <div className="space-y-2">
              {group.members?.map(m => (
                <Link key={m.user.id} to={`/profile/${m.user.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-2xl">{m.user.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.user.nickname} {m.role === 'admin' && <span className="text-xs text-blue-500">· 管理员</span>}</p>
                    <p className="text-xs text-gray-400">@{m.user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
