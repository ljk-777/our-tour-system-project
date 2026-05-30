import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  deleteGroup,
  generateGroupTrip,
  getGroup,
  getGroupConflictAnalysis,
  getGroupPreferences,
  getMessages,
  getTrip,
  leaveGroup,
  previewGroupRoute,
  removeGroupMember,
  saveMyGroupPreference,
  saveTrip,
  sendMessage,
  updateGroupMemberRole,
} from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = { admin: '管理员', editor: '编辑者', member: '成员' };
const STATUS_OPTIONS = ['待定', '已确认', '已取消'];
const TYPE_OPTIONS = ['景点', '美食', '交通', '住宿', '休息'];

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [trip, setTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [conflict, setConflict] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeMode, setRouteMode] = useState('walking');
  const [tab, setTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [messageText, setMessageText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const chatScrollRef = useRef(null);

  const isAdmin = group?.members?.some((m) => m.user.id === user?.id && m.role === 'admin');
  const myPreference = preferences.find((item) => item.userId === user?.id);

  const loadAll = useCallback(async () => {
    if (!id) return;
    const [gRes, tRes, mRes, pRes] = await Promise.all([
      getGroup(id).catch(() => ({ data: { data: null } })),
      getTrip(id).catch(() => ({ data: { data: null } })),
      getMessages(id, {}).catch(() => ({ data: { data: [] } })),
      getGroupPreferences(id).catch(() => ({ data: { data: [] } })),
    ]);
    setGroup(gRes.data?.data || null);
    setTrip(tRes.data?.data || null);
    setMessages(mRes.data?.data || []);
    setPreferences(pRes.data?.data || []);
  }, [id]);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    const timer = setInterval(loadAll, 10000);
    return () => clearInterval(timer);
  }, [loadAll]);

  useEffect(() => {
    if (tab !== 'chat') return;
    const el = chatScrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 180) el.scrollTop = el.scrollHeight;
  }, [messages, tab]);

  const openEditor = () => {
    setEditTrip(normalizeTrip(trip));
    setEditing(true);
  };

  const saveCurrentTrip = async (payload = editTrip) => {
    if (!payload?.destination?.trim()) return alert('请填写目的地');
    setBusy('saveTrip');
    try {
      const res = await saveTrip(id, normalizeTrip(payload));
      setTrip(res.data.data);
      setEditing(false);
      await loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || '保存失败');
    } finally {
      setBusy('');
    }
  };

  const handleAiTrip = async () => {
    const base = normalizeTrip(editing ? editTrip : trip);
    if (!base.destination?.trim()) return alert('请先填写目的地');
    setBusy('aiTrip');
    try {
      const res = await generateGroupTrip(id, base);
      const next = normalizeTrip({ ...base, ...res.data.data });
      setEditTrip(next);
      setEditing(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'AI 生成失败');
    } finally {
      setBusy('');
    }
  };

  const handlePreviewRoute = async () => {
    const day = (trip?.dailyPlan || [])[selectedDay];
    const waypoints = (day?.activities || [])
      .filter((act) => act.spotId || act.name)
      .map((act) => ({ spotId: act.spotId || null, name: act.name, city: trip?.destination || group?.name || '' }));
    if (waypoints.length < 2) return alert('当天至少需要 2 个带名称的活动');
    setBusy('route');
    try {
      const res = await previewGroupRoute(id, { waypoints, mode: routeMode });
      setRouteResult(res.data.data);
    } catch (err) {
      alert(err?.response?.data?.message || '路线生成失败');
    } finally {
      setBusy('');
    }
  };

  const handleConflict = async () => {
    setBusy('conflict');
    try {
      const res = await getGroupConflictAnalysis(id);
      setConflict(res.data.data);
    } catch (err) {
      alert(err?.response?.data?.message || '冲突分析失败');
    } finally {
      setBusy('');
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setBusy('message');
    try {
      await sendMessage(id, { content: messageText.trim() });
      setMessageText('');
      const res = await getMessages(id, {});
      setMessages(res.data?.data || []);
    } finally {
      setBusy('');
    }
  };

  const memberOptions = useMemo(() => group?.members || [], [group]);

  if (loading) return <Shell><div className="text-center py-24 text-gray-400">加载中...</div></Shell>;
  if (!group) return <Shell><div className="text-center py-24 text-gray-500">群组不存在，或你没有访问权限</div></Shell>;

  return (
    <Shell>
      <div className="group-panel group-header flex items-center justify-between gap-3 mb-3 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/groups" className="text-xs text-gray-400 hover:text-gray-700 shrink-0">返回</Link>
          <div>
            <h1 className="text-lg font-bold text-gray-950 truncate leading-tight">{group.name}</h1>
            <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-1">
              加入码 <span className="font-mono tracking-widest text-blue-600">{group.code}</span>
              <button onClick={() => navigator.clipboard?.writeText(group.code)} className="ml-2 text-blue-500 hover:underline">复制</button>
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {isAdmin && <button onClick={() => confirm('确定删除群组？') && deleteGroup(id).then(() => { window.location.href = '/groups'; })} className="px-2.5 py-1.5 rounded border border-red-100 text-xs text-red-500 hover:bg-red-50">删除</button>}
          <button onClick={() => confirm('确定退出群组？') && leaveGroup(id).then(() => { window.location.href = '/groups'; }).catch((err) => alert(err?.response?.data?.message || '退出失败'))} className="px-2.5 py-1.5 rounded text-xs text-gray-500 hover:bg-gray-100">退出</button>
        </div>
      </div>

      <div className="group-panel flex gap-1 mb-3 overflow-x-auto p-1">
        {[
          ['itinerary', '行程'],
          ['route', '路线'],
          ['preferences', '偏好'],
          ['conflict', '协调'],
          ['chat', '聊天'],
          ['members', '成员'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`group-tab ${tab === key ? 'group-tab-active' : ''}`}>{label}</button>
        ))}
      </div>

      {tab === 'itinerary' && (
        <ItineraryTab
          busy={busy}
          editing={editing}
          editTrip={editTrip}
          memberOptions={memberOptions}
          onAiTrip={handleAiTrip}
          onCancel={() => setEditing(false)}
          onEdit={openEditor}
          onSave={() => saveCurrentTrip()}
          setEditTrip={setEditTrip}
          trip={trip}
        />
      )}

      {tab === 'route' && (
        <RouteTab
          busy={busy}
          routeResult={routeResult}
          routeMode={routeMode}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          setRouteMode={setRouteMode}
          trip={trip}
          onPreview={handlePreviewRoute}
        />
      )}

      {tab === 'preferences' && (
        <PreferenceTab
          current={myPreference}
          preferences={preferences}
          onSave={async (payload) => {
            setBusy('preference');
            try {
              const saved = await saveMyGroupPreference(id, payload);
              const res = await getGroupPreferences(id);
              setPreferences(res.data.data || []);
              return saved.data?.data;
            } catch (err) {
              const message = err?.response?.data?.message || '偏好保存失败，请稍后重试';
              alert(message);
              throw new Error(message);
            } finally {
              setBusy('');
            }
          }}
          busy={busy}
        />
      )}

      {tab === 'conflict' && (
        <ConflictTab busy={busy} conflict={conflict} preferences={preferences} onAnalyze={handleConflict} />
      )}

      {tab === 'chat' && (
        <ChatTab
          busy={busy}
          chatScrollRef={chatScrollRef}
          messageText={messageText}
          messages={messages}
          setMessageText={setMessageText}
          user={user}
          onSend={handleSend}
        />
      )}

      {tab === 'members' && (
        <MembersTab
          group={group}
          isAdmin={isAdmin}
          user={user}
          onRemove={async (targetId) => {
            await removeGroupMember(id, targetId);
            await loadAll();
          }}
          onRole={async (targetId, role) => {
            await updateGroupMemberRole(id, targetId, role);
            await loadAll();
          }}
        />
      )}
    </Shell>
  );
}

function ItineraryTab({ busy, editing, editTrip, memberOptions, onAiTrip, onCancel, onEdit, onSave, setEditTrip, trip }) {
  if (editing) {
    return (
      <Panel>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-bold text-gray-900">编辑群行程</h2>
          <button onClick={onAiTrip} disabled={busy === 'aiTrip'} className="px-2.5 py-1.5 rounded border border-blue-200 text-xs text-blue-600 hover:bg-blue-50">{busy === 'aiTrip' ? '生成中...' : 'AI 生成'}</button>
        </div>
        <div className="grid md:grid-cols-6 gap-2 mb-2">
          <input value={editTrip.destination} onChange={(e) => setEditTrip((p) => ({ ...p, destination: e.target.value }))} placeholder="目的地" className="compact-input md:col-span-2" />
          <input value={editTrip.departure || ''} onChange={(e) => setEditTrip((p) => ({ ...p, departure: e.target.value }))} placeholder="出发地" className="compact-input md:col-span-2" />
          <input type="date" value={editTrip.startDate || ''} onChange={(e) => setEditTrip((p) => ({ ...p, startDate: e.target.value }))} className="compact-input" />
          <input type="date" value={editTrip.endDate || ''} onChange={(e) => setEditTrip((p) => ({ ...p, endDate: e.target.value }))} className="compact-input" />
          <input value={editTrip.title || ''} onChange={(e) => setEditTrip((p) => ({ ...p, title: e.target.value }))} placeholder="标题" className="compact-input md:col-span-4" />
          <input type="number" value={editTrip.budget || ''} onChange={(e) => setEditTrip((p) => ({ ...p, budget: e.target.value }))} placeholder="预算" className="compact-input md:col-span-2" />
        </div>
        <textarea value={editTrip.notes || ''} onChange={(e) => setEditTrip((p) => ({ ...p, notes: e.target.value }))} placeholder="备注" rows={2} className="compact-input resize-none mb-3" />
        <div className="space-y-2">
          {(editTrip.dailyPlan || []).map((day, dayIndex) => (
            <div key={dayIndex} className="border border-gray-200 rounded-md bg-gray-50">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-700">D{day.day}</span>
                <input type="date" value={day.date || ''} onChange={(e) => updateDay(setEditTrip, dayIndex, { date: e.target.value })} className="compact-mini" />
                <button onClick={() => addActivity(setEditTrip, dayIndex)} className="ml-auto text-xs text-blue-600">+ 活动</button>
              </div>
              <div>
                {(day.activities || []).map((act, actIndex) => (
                  <div key={act.id || actIndex} className="grid md:grid-cols-12 gap-1.5 bg-white px-2 py-1.5 border-b border-gray-100 last:border-0">
                    <input value={act.time || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { time: e.target.value })} placeholder="09:00" className="compact-mini" />
                    <select value={act.type || '景点'} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { type: e.target.value })} className="compact-mini md:col-span-2">{TYPE_OPTIONS.map((v) => <option key={v}>{v}</option>)}</select>
                    <input value={act.name || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { name: e.target.value })} placeholder="名称" className="compact-mini md:col-span-3" />
                    <input value={act.spotId || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { spotId: e.target.value })} placeholder="ID" className="compact-mini" />
                    <select value={act.ownerId || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { ownerId: e.target.value || null })} className="compact-mini md:col-span-2">
                      <option value="">负责人</option>
                      {memberOptions.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.nickname || m.user.username}</option>)}
                    </select>
                    <select value={act.status || '待定'} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { status: e.target.value })} className="compact-mini md:col-span-2">{STATUS_OPTIONS.map((v) => <option key={v}>{v}</option>)}</select>
                    <input value={act.cost || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { cost: e.target.value })} placeholder="费用" className="compact-mini" />
                    <input value={act.description || ''} onChange={(e) => updateActivity(setEditTrip, dayIndex, actIndex, { description: e.target.value })} placeholder="说明" className="compact-mini md:col-span-11" />
                    <button onClick={() => removeActivity(setEditTrip, dayIndex, actIndex)} className="text-xs text-red-500">删</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => addDay(setEditTrip)} className="text-xs text-blue-600">+ 添加一天</button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs text-gray-500 hover:bg-gray-100">取消</button>
            <button onClick={onSave} disabled={busy === 'saveTrip'} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{busy === 'saveTrip' ? '保存中...' : '保存'}</button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{trip?.title || trip?.destination || '尚未创建行程'}</h2>
          {trip && <p className="text-xs text-gray-500">{trip.departure || '未填出发地'} {'->'} {trip.destination}</p>}
        </div>
        <button onClick={onEdit} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{trip ? '编辑' : '创建'}</button>
      </div>
      {!trip ? <p className="text-sm text-gray-400">先创建行程，再用路线、偏好和冲突协调来完善它。</p> : (
        <div className="space-y-2">
          {trip.notes && <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">{trip.notes}</p>}
          {(trip.dailyPlan || []).map((day) => <DayView key={day.day} day={day} />)}
        </div>
      )}
    </Panel>
  );
}

function RouteTab({ busy, routeMode, routeResult, selectedDay, setRouteMode, setSelectedDay, trip, onPreview }) {
  const days = trip?.dailyPlan || [];
  const day = days[selectedDay];
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{'\u9ad8\u5fb7\u8def\u7ebf'}</h2>
          <p className="text-xs text-gray-500">{'\u6309\u5f53\u5929\u6d3b\u52a8\u7684\u540d\u79f0\u6216\u666f\u70b9 ID \u8c03\u7528\u9ad8\u5fb7 API\uff0c\u751f\u6210\u771f\u5b9e\u8ddd\u79bb\u3001\u65f6\u95f4\u548c\u5bfc\u822a\u6b65\u9aa4\u3002'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={routeMode} onChange={(e) => setRouteMode(e.target.value)} className="compact-mini w-24">
            <option value="walking">{'\u6b65\u884c'}</option>
            <option value="driving">{'\u9a7e\u8f66'}</option>
            <option value="cycling">{'\u9a91\u884c'}</option>
            <option value="transit">{'\u516c\u4ea4'}</option>
          </select>
          <button onClick={onPreview} disabled={busy === 'route'} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{busy === 'route' ? '\u751f\u6210\u4e2d...' : '\u751f\u6210\u8def\u7ebf'}</button>
        </div>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {days.map((item, index) => <button key={item.day} onClick={() => setSelectedDay(index)} className={`px-2.5 py-1 rounded-md text-xs border ${selectedDay === index ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}>D{item.day}</button>)}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-md p-2.5">
          <h3 className="text-xs font-semibold mb-1.5">{'\u9014\u7ecf\u70b9'}</h3>
          {(day?.activities || []).map((act, index) => (
            <div key={act.id || index} className="flex justify-between text-xs py-1.5 border-b last:border-0">
              <span>{act.time || '--:--'} {act.name}</span>
              <span className={act.spotId ? 'text-blue-600' : 'text-gray-300'}>{act.spotId ? `#${act.spotId}` : '\u6309\u540d\u79f0\u89e3\u6790'}</span>
            </div>
          ))}
        </div>
        <div className="border border-gray-100 rounded-md p-2.5">
          <h3 className="text-xs font-semibold mb-1.5">{'\u9ad8\u5fb7\u7ed3\u679c'}</h3>
          {!routeResult ? <p className="text-sm text-gray-400">{'\u8fd8\u6ca1\u6709\u751f\u6210\u8def\u7ebf\u3002'}</p> : (
            <div className="space-y-1.5 text-xs">
              <p>{'\u670d\u52a1\uff1a'}{routeResult.algorithm}</p>
              <p>{'\u65b9\u5f0f\uff1a'}{modeLabel(routeResult.mode)}</p>
              <p>{'\u603b\u8ddd\u79bb\uff1a'}{formatDistance(routeResult.totalDistance || routeResult.totalCost)}</p>
              <p>{'\u9884\u8ba1\u7528\u65f6\uff1a'}{formatDuration(routeResult.totalDuration)}</p>
              <p>{'\u9014\u7ecf\u987a\u5e8f\uff1a'}{(routeResult.orderSpots || []).map((s) => s.name || s.id).join(' -> ')}</p>
              {(routeResult.segments || []).map((seg, index) => (
                <div key={`${seg.from}-${seg.to}-${index}`} className="group-soft-row px-2 py-1.5">
                  <div className="font-medium text-gray-800">{seg.fromName}{' -> '}{seg.toName}</div>
                  <div className="text-gray-500">{formatDistance(seg.distance)} / {formatDuration(seg.duration)}</div>
                  {seg.steps?.[0]?.instruction && <div className="text-gray-400 truncate">{seg.steps[0].instruction}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
function PreferenceTab({ busy, current, preferences, onSave }) {
  const [form, setForm] = useState(() => ({
    budgetLevel: current?.budgetLevel || 3,
    staminaLevel: current?.staminaLevel || 3,
    paceLevel: current?.paceLevel || 3,
    photoLevel: current?.photoLevel || 3,
    foodPreference: current?.foodPreference || '',
    dietaryRestrictions: current?.dietaryRestrictions || '',
    notes: current?.notes || '',
  }));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (current) setForm({
      budgetLevel: current.budgetLevel,
      staminaLevel: current.staminaLevel,
      paceLevel: current.paceLevel,
      photoLevel: current.photoLevel,
      foodPreference: current.foodPreference,
      dietaryRestrictions: current.dietaryRestrictions,
      notes: current.notes,
    });
  }, [current]);

  const handleSave = async () => {
    setNotice(null);
    try {
      await onSave(form);
      setNotice({ type: 'success', text: '已保存，群组偏好概览已更新。' });
    } catch (err) {
      setNotice({ type: 'error', text: err?.message || '保存失败，请稍后重试。' });
    }
  };

  useEffect(() => {
    const interceptSaveClick = (event) => {
      const button = event.target?.closest?.('button');
      if (!button || !button.textContent?.includes('保存')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleSave();
    };
    document.addEventListener('click', interceptSaveClick, true);
    return () => document.removeEventListener('click', interceptSaveClick, true);
  }, [handleSave]);

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Panel>
        <h2 className="text-sm font-bold text-gray-900 mb-2">我的旅行偏好</h2>
        {[
          ['budgetLevel', '预算敏感度'],
          ['staminaLevel', '体力强度'],
          ['paceLevel', '旅行节奏'],
          ['photoLevel', '拍照偏好'],
        ].map(([key, label]) => (
          <label key={key} className="grid grid-cols-[76px_1fr_20px] items-center gap-2 mb-2 text-xs">
            <span className="text-gray-600">{label}</span>
            <input type="range" min="1" max="5" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full" />
            <span className="text-gray-400">{form[key]}</span>
          </label>
        ))}
        <input value={form.foodPreference} onChange={(e) => setForm((p) => ({ ...p, foodPreference: e.target.value }))} placeholder="饮食偏好" className="compact-input mb-2" />
        <input value={form.dietaryRestrictions} onChange={(e) => setForm((p) => ({ ...p, dietaryRestrictions: e.target.value }))} placeholder="忌口" className="compact-input mb-2" />
        <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="其他说明" className="compact-input resize-none mb-3" rows={2} />
        <button onClick={() => onSave(form)} disabled={busy === 'preference'} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{busy === 'preference' ? '保存中...' : '保存'}</button>
        {notice && <p className={`mt-2 text-xs ${notice.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{notice.text}</p>}
      </Panel>
      <Panel>
        <h2 className="text-sm font-bold text-gray-900 mb-2">群组偏好概览</h2>
        {preferences.length === 0 ? <p className="text-sm text-gray-400">暂无成员填写偏好。</p> : preferences.map((item) => (
          <div key={item.userId} className="border-b last:border-0 py-2 text-xs">
            <div className="font-medium text-gray-900">{item.userAvatar} {item.userName || `用户${item.userId}`}</div>
            <div className="text-gray-500 mt-1">预算 {item.budgetLevel} / 体力 {item.staminaLevel} / 节奏 {item.paceLevel} / 拍照 {item.photoLevel}</div>
            {(item.foodPreference || item.dietaryRestrictions) && <div className="text-gray-400 mt-1">{item.foodPreference} {item.dietaryRestrictions}</div>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

function ConflictTab({ busy, conflict, preferences, onAnalyze }) {
  return (
    <Panel>
      <div className="flex justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">冲突协调</h2>
          <p className="text-xs text-gray-500">基于成员偏好做规则分析，并在有 API Key 时生成智能建议。</p>
        </div>
        <button onClick={onAnalyze} disabled={busy === 'conflict' || preferences.length === 0} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{busy === 'conflict' ? '分析中...' : '分析'}</button>
      </div>
      {!conflict ? <p className="text-sm text-gray-400">填写偏好后点击分析。</p> : (
        <div className="space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <Metric label="一致度" value={`${conflict.consistencyScore}%`} />
            <Metric label="风险等级" value={conflict.riskLevel} />
            <Metric label="目的地" value={conflict.destination || '未填'} />
          </div>
          <div className="grid md:grid-cols-4 gap-2">
            {(conflict.dimensions || []).map((d) => <div key={d.key} className="bg-gray-50 rounded-md p-2 text-xs"><div className="font-medium">{d.label}</div><div className="text-gray-500 mt-1">均值 {d.avg} / 差异 {d.conflict}</div></div>)}
          </div>
          <SuggestionList title="规则建议" items={conflict.suggestions || []} />
          {conflict.ai && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs">
              <div className="font-semibold text-blue-900 mb-1.5">AI 折中方案</div>
              <p className="text-blue-800 mb-2">{conflict.ai.summary}</p>
              <SuggestionList title="" items={conflict.ai.suggestions || []} />
              {conflict.ai.splitPlan && <p className="text-blue-700 mt-2">{conflict.ai.splitPlan}</p>}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function ChatTab({ busy, chatScrollRef, messageText, messages, setMessageText, user, onSend }) {
  return (
    <Panel className="p-0">
      <div ref={chatScrollRef} className="h-[340px] overflow-y-auto p-3 space-y-2.5 bg-white/30">
        {messages.map((m) => (
          <div key={m.id}>
            {m.type === 'system' ? <div className="text-center text-[11px] text-gray-400 py-1">{m.content}</div> : (
              <div className={`flex gap-2 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                <span className="text-lg shrink-0">{m.senderAvatar || '🧑'}</span>
                <div className={`max-w-[72%] rounded-xl px-3 py-2 text-xs shadow-sm ${m.senderId === user?.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-slate-100'}`}>
                  {m.senderId !== user?.id && <p className="text-xs font-medium mb-1 opacity-70">{m.senderName}</p>}
                  <p>{m.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-white/70 bg-white/70 p-2 flex gap-2">
        <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="输入消息..." maxLength={2000} className="compact-input" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSend())} />
        <button onClick={onSend} disabled={busy === 'message' || !messageText.trim()} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-medium text-white">{busy === 'message' ? '...' : '发送'}</button>
      </div>
    </Panel>
  );
}

function MembersTab({ group, isAdmin, onRemove, onRole, user }) {
  return (
    <Panel>
      <h2 className="text-sm font-bold text-gray-900 mb-2">成员管理</h2>
      <div className="space-y-1.5">
        {group.members?.map((m) => (
          <div key={m.user.id} className="group-soft-row flex items-center gap-3 px-2.5 py-2">
            <Link to={`/profile/${m.user.id}`} className="grid size-8 place-items-center rounded-full bg-white text-base shadow-sm">{m.user.avatar}</Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${m.user.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{m.user.nickname || m.user.username}</Link>
              <p className="text-xs text-gray-400">@{m.user.username} / {ROLE_LABELS[m.role] || m.role}</p>
            </div>
            {isAdmin && m.user.id !== user?.id && (
              <div className="flex gap-2">
                <select value={m.role} onChange={(e) => onRole(m.user.id, e.target.value)} className="compact-mini">
                  {Object.keys(ROLE_LABELS).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </select>
                <button onClick={() => confirm('确定移除该成员？') && onRemove(m.user.id)} className="text-xs text-red-500">移除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DayView({ day }) {
  return (
    <div className="group-soft-row overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-950 border-b border-slate-100 flex items-center gap-2"><span className="group-chip group-chip-blue">D{day.day}</span>{day.date && <span className="text-gray-500 font-normal">{day.date}</span>}</div>
      <div className="divide-y divide-slate-100">
        {(day.activities || []).map((act, index) => (
          <div key={act.id || index} className="grid grid-cols-[56px_56px_minmax(0,1fr)_54px] gap-2 bg-white/82 px-3 py-2 text-xs hover:bg-white transition-colors">
            <div className="font-mono text-gray-500">{act.time || '--:--'}</div>
            <div className="text-gray-500"><span className="group-chip">{act.type}</span></div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{act.name || '未命名活动'}</div>
              {act.description && <p className="text-gray-400 truncate mt-0.5">{act.description}</p>}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {act.spotId && <span className="text-gray-400">#{act.spotId}</span>}
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{act.status || '待定'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }) {
  return <div className="glass-bg group-page min-h-screen"><div className="max-w-4xl mx-auto px-4 py-4">{children}</div></div>;
}

function Panel({ children, className = '' }) {
  return <div className={`group-panel p-3 ${className}`}>{children}</div>;
}

function Metric({ label, value }) {
  return <div className="group-soft-row p-2.5"><div className="text-[11px] text-gray-500">{label}</div><div className="text-base font-bold text-gray-950 mt-0.5">{value}</div></div>;
}

function SuggestionList({ title, items }) {
  return <div>{title && <div className="group-section-title mb-1.5">{title}</div>}<ul className="space-y-1.5 text-xs text-gray-600">{items.map((item, i) => <li key={i} className="group-soft-row px-2.5 py-1.5">{item}</li>)}</ul></div>;
}

function modeLabel(mode) {
  return ({ walking: '步行', driving: '驾车', cycling: '骑行', transit: '公交' })[mode] || mode || '步行';
}

function formatDistance(value) {
  const meters = Number(value || 0);
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(value) {
  const seconds = Number(value || 0);
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}小时${Math.round((seconds % 3600) / 60)}分钟`;
  return `${Math.max(1, Math.round(seconds / 60))}分钟`;
}

function normalizeTrip(source) {
  const trip = source || { destination: '', dailyPlan: [] };
  return {
    title: trip.title || '',
    departure: trip.departure || '',
    destination: trip.destination || '',
    startDate: toDateInput(trip.startDate),
    endDate: toDateInput(trip.endDate),
    budget: trip.budget || '',
    notes: trip.notes || '',
    dailyPlan: (trip.dailyPlan || []).map((day, dayIndex) => ({
      day: Number(day.day || dayIndex + 1),
      date: toDateInput(day.date),
      activities: (day.activities || []).map((act, actIndex) => ({
        id: act.id || `a-${dayIndex + 1}-${actIndex + 1}-${Date.now()}`,
        time: act.time || '',
        type: act.type || '景点',
        name: act.name || '',
        spotId: act.spotId || '',
        cost: act.cost || '',
        ownerId: act.ownerId || '',
        status: act.status || '待定',
        description: act.description || '',
        notes: act.notes || '',
      })),
    })),
  };
}

function toDateInput(value) {
  if (!value) return '';
  return `${value}`.slice(0, 10);
}

function addDay(setEditTrip) {
  setEditTrip((prev) => {
    const list = prev.dailyPlan || [];
    return { ...prev, dailyPlan: [...list, { day: list.length + 1, date: '', activities: [] }] };
  });
}

function addActivity(setEditTrip, dayIndex) {
  setEditTrip((prev) => {
    const plan = [...(prev.dailyPlan || [])];
    const activities = [...(plan[dayIndex].activities || [])];
    activities.push({ id: `a-${dayIndex + 1}-${activities.length + 1}-${Date.now()}`, time: '', type: '景点', name: '', spotId: '', cost: '', ownerId: '', status: '待定', description: '' });
    plan[dayIndex] = { ...plan[dayIndex], activities };
    return { ...prev, dailyPlan: plan };
  });
}

function updateDay(setEditTrip, dayIndex, patch) {
  setEditTrip((prev) => {
    const plan = [...(prev.dailyPlan || [])];
    plan[dayIndex] = { ...plan[dayIndex], ...patch };
    return { ...prev, dailyPlan: plan };
  });
}

function updateActivity(setEditTrip, dayIndex, actIndex, patch) {
  setEditTrip((prev) => {
    const plan = [...(prev.dailyPlan || [])];
    const activities = [...(plan[dayIndex].activities || [])];
    activities[actIndex] = { ...activities[actIndex], ...patch };
    plan[dayIndex] = { ...plan[dayIndex], activities };
    return { ...prev, dailyPlan: plan };
  });
}

function removeActivity(setEditTrip, dayIndex, actIndex) {
  setEditTrip((prev) => {
    const plan = [...(prev.dailyPlan || [])];
    plan[dayIndex] = { ...plan[dayIndex], activities: (plan[dayIndex].activities || []).filter((_, i) => i !== actIndex) };
    return { ...prev, dailyPlan: plan };
  });
}
