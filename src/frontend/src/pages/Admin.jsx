import { useState, useEffect, useMemo } from 'react';
import { getUsers, getDiaries, getSpots, getGroups } from '../api/index.js';
import {
  Search, X, Download, RefreshCw, ArrowUpDown,
  ChevronLeft, ChevronRight, Heart, Star,
  AlertTriangle, Inbox, Trash2, Users
} from 'lucide-react';

const ALL_TABS = [
  { id: 'overview', label: '📊 总览' },
  { id: 'users', label: '用户' },
  { id: 'diaries', label: '日记' },
  { id: 'spots', label: '景点' },
  { id: 'groups', label: '群组' },
  { id: 'health', label: '🔍 健康' },
  { id: 'comments', label: '💬 评论' },
];
const TABS_LABELS = {
  overview: '数据概览',
  users: '用户管理',
  diaries: '日记管理',
  spots: '景点管理',
  groups: '群组管理',
  health: '数据健康检查',
  comments: '评论管理',
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ users: [], diaries: [], spots: [] });
  const [loading, setLoading] = useState({ users: false, diaries: false, spots: false });
  const [error, setError] = useState({ users: null, diaries: null, spots: null });
  const [groups, setGroups] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [groupDetails, setGroupDetails] = useState({});
  const [commentPage, setCommentPage] = useState(1);
  const [dashboardMode, setDashboardMode] = useState(false);
  const [dashboardView, setDashboardView] = useState(0);
  const [dashboardPaused, setDashboardPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const pageSize = 20;

  const fetchData = async (type, forceRefresh = false) => {
    if (!forceRefresh && data[type]?.length > 0 && type !== 'groups') return;
    if (type === 'overview' || type === 'health') return;
    setLoading(prev => ({ ...prev, [type]: true }));
    setError(prev => ({ ...prev, [type]: null }));
    try {
      let result;
      if (type === 'users') result = await getUsers();
      else if (type === 'diaries') result = await getDiaries();
      else if (type === 'spots') result = await getSpots();
      else if (type === 'groups') {
        const r = await getGroups();
        setGroups(r.data?.data || []);
        setLastRefresh(new Date());
        return;
      }
      const fetchedData = result?.data?.data || [];
      setData(prev => ({ ...prev, [type]: fetchedData }));
      setLastRefresh(new Date());
    } catch (err) {
      setError(prev => ({ ...prev, [type]: err?.message || '加载失败' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    Promise.all([
      fetchData('users', true),
      fetchData('diaries', true),
      fetchData('spots', true),
      fetchData('groups', true),
    ]);
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setCommentPage(1);
    if (activeTab === 'overview' || activeTab === 'health' || activeTab === 'comments') return;
    fetchData(activeTab);
    setSearchQuery('');
    setCurrentPage(1);
    setTypeFilter('');
    setSortField(null);
  }, [activeTab]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) { setDashboardMode(false); setDashboardView(0); }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Dashboard auto-rotation
  useEffect(() => {
    if (!dashboardMode || dashboardPaused) return;
    const timer = setInterval(() => {
      setDashboardView(prev => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(timer);
  }, [dashboardMode, dashboardPaused]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const filterOptions = useMemo(() => {
    const items = data[activeTab] || [];
    if (activeTab === 'spots') {
      return [...new Set(items.map(s => s.type).filter(Boolean))].sort();
    }
    if (activeTab === 'diaries') {
      return [...new Set(items.flatMap(d => d.tags || []))].filter(Boolean).sort();
    }
    return [];
  }, [activeTab, data]);

  const insight = useMemo(() => {
    const parts = [];
    const totalUsers = data.users?.length || 0;
    const totalDiaries = data.diaries?.length || 0;
    const totalSpots = data.spots?.length || 0;
    if (totalUsers > 0) parts.push(`${totalUsers} 位旅行者`);
    if (totalDiaries > 0) parts.push(`${totalDiaries} 篇旅行日记`);
    if (totalSpots > 0) parts.push(`${totalSpots} 个景点`);
    const today = new Date().toISOString().split('T')[0];
    const todayUsers = data.users?.filter(u => u.createdAt?.startsWith(today)).length || 0;
    const todayDiaries = data.diaries?.filter(d => d.createdAt?.startsWith(today)).length || 0;
    let report = `📊 共有 ${parts.join('、')}。`;
    const activities = [];
    if (todayUsers > 0) activities.push(`${todayUsers} 位新用户`);
    if (todayDiaries > 0) activities.push(`${todayDiaries} 篇新日记`);
    if (activities.length > 0) report += `今日新增 ${activities.join('、')}。`;
    const topUser = [...(data.users || [])].sort((a, b) => (b.totalDiaries || 0) - (a.totalDiaries || 0))[0];
    if (topUser && topUser.totalDiaries > 0) report += `最活跃用户 ${topUser.nickname || topUser.username} 发布了 ${topUser.totalDiaries} 篇日记。`;
    const zeroRating = data.spots?.filter(s => !s.rating || s.rating === 0).length || 0;
    if (zeroRating > 0) report += `⚠️ 有 ${zeroRating} 个景点评分为 0，建议检查。`;
    return report;
  }, [data]);

  const processedItems = useMemo(() => {
    let items = data[activeTab] || [];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      items = items.filter(item => {
        if (activeTab === 'users') {
          return (
            item.username?.toLowerCase().includes(query) ||
            item.nickname?.toLowerCase().includes(query) ||
            item.email?.toLowerCase().includes(query) ||
            String(item.id).includes(query)
          );
        } else if (activeTab === 'diaries') {
          return (
            item.title?.toLowerCase().includes(query) ||
            item.content?.toLowerCase().includes(query) ||
            item.userName?.toLowerCase().includes(query) ||
            String(item.id).includes(query) ||
            String(item.userId).includes(query)
          );
        } else if (activeTab === 'spots') {
          return (
            item.name?.toLowerCase().includes(query) ||
            item.city?.toLowerCase().includes(query) ||
            item.type?.toLowerCase().includes(query) ||
            String(item.id).includes(query)
          );
        }
        return false;
      });
    }

    if (typeFilter) {
      if (activeTab === 'spots') {
        items = items.filter(s => s.type === typeFilter);
      } else if (activeTab === 'diaries') {
        items = items.filter(d => (d.tags || []).includes(typeFilter));
      }
    }

    if (sortField) {
      items = [...items].sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va == null) va = '';
        if (vb == null) vb = '';
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [activeTab, data, searchQuery, typeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(processedItems.length / pageSize);
  const validPage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
  const paginatedItems = processedItems.slice((validPage - 1) * pageSize, validPage * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    const maxVis = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVis / 2));
    let end = Math.min(totalPages, start + maxVis - 1);
    if (end - start + 1 < maxVis) start = Math.max(1, end - maxVis + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const statistics = useMemo(() => {
    const items = data[activeTab] || [];
    const today = new Date().toISOString().split('T')[0];
    if (activeTab === 'users') {
      const todayNew = items.filter(u => u.createdAt?.startsWith(today)).length;
      return { total: items.length, todayNew, label: '用户' };
    } else if (activeTab === 'diaries') {
      const todayNew = items.filter(d => d.createdAt?.startsWith(today)).length;
      const totalLikes = items.reduce((s, d) => s + (d.likes || 0), 0);
      return { total: items.length, todayNew, totalLikes, label: '日记' };
    } else if (activeTab === 'spots') {
      const avgRating = items.length > 0
        ? (items.reduce((s, sp) => s + (sp.rating || 0), 0) / items.length).toFixed(1)
        : 0;
      return { total: items.length, avgRating, label: '景点' };
    }
    return { total: 0, label: '' };
  }, [activeTab, data]);

  const formatDate = (ds) => {
    if (!ds) return '-';
    return new Date(ds).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const renderStars = (rating) => {
    const full = Math.floor(rating || 0);
    return (
      <div className="flex gap-0.5 items-center">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={12} fill={i <= full ? '#facc15' : '#d1d5db'} className={i <= full ? 'text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
    );
  };

  const exportCSV = () => {
    const items = processedItems;
    if (items.length === 0) return;
    let csv = '';
    if (activeTab === 'users') {
      csv = 'ID,用户名,昵称,邮箱,注册日期\n' +
        items.map(u =>
          `${u.id},"${u.username || ''}","${u.nickname || ''}","${u.email || ''}","${formatDate(u.createdAt)}"`
        ).join('\n');
    } else if (activeTab === 'diaries') {
      csv = 'ID,用户ID,用户名,标题,点赞,创建日期\n' +
        items.map(d =>
          `${d.id},${d.userId || ''},"${d.userName || ''}","${(d.title || '').replace(/"/g, '""')}",${d.likes || 0},"${formatDate(d.createdAt)}"`
        ).join('\n');
    } else if (activeTab === 'spots') {
      csv = 'ID,名称,城市,类型,评分\n' +
        items.map(s =>
          `${s.id},"${s.name || ''}","${s.city || ''}","${s.type || ''}",${s.rating || 0}`
        ).join('\n');
    }
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return '刚刚更新';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前更新`;
    return `${Math.floor(diff / 3600)} 小时前更新`;
  };

  const SortTh = ({ field, children, className = '' }) => (
    <th
      className={`px-4 py-3 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <ArrowUpDown size={12} className={`transition-opacity ${sortField === field ? 'text-blue-500 opacity-100' : 'text-gray-300 opacity-60'}`} />
        {sortField === field && (
          <span className="text-blue-500 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-100 rounded-xl" />
      <div className="h-40 bg-gray-100 rounded-xl" />
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="relative inline-block w-10 h-10 mb-3">
          <div className="absolute inset-0 border-2 border-gray-300 rounded-none"></div>
          <div className="absolute inset-0 border-t-2 border-blue-500 animate-spin"></div>
        </div>
        <p className="text-gray-500 font-mono text-sm tracking-wide">加载中...</p>
      </div>
    </div>
  );

  const renderError = (type) => (
    <div className="text-center py-20">
      <div className="flex justify-center mb-3"><AlertTriangle size={40} className="text-red-400" /></div>
      <p className="text-red-500 font-mono font-medium">加载失败</p>
      <p className="text-sm text-gray-500 mt-2 font-mono">{error[type]}</p>
      <button onClick={() => fetchData(type, true)}
        className="mt-4 px-6 py-2 bg-white border border-gray-300 text-gray-700 font-mono text-sm hover:bg-gray-50 hover:border-gray-400 transition-all rounded-lg">
        重新加载
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="text-center py-20">
      <div className="flex justify-center mb-4 opacity-30"><Inbox size={48} className="text-gray-400" /></div>
      <p className="text-gray-500 font-mono">暂无数据</p>
      <p className="text-sm text-gray-400 mt-2">当前数据集为空，请尝试刷新或检查数据源</p>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600">
          第 <span className="font-medium text-gray-900">{currentPage}</span> 页，共
          <span className="font-medium text-gray-900">{totalPages}</span> 页
          <span className="text-gray-400 ml-2">(共 {processedItems.length} 条)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1 ${
              currentPage === 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            <ChevronLeft size={14} /> 上一页
          </button>
          {getPageNumbers().map(p => (
            <button key={p} onClick={() => setCurrentPage(p)}
              className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                currentPage === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>{p}</button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1 ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            下一页 <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const handleBatchDelete = async (type) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 项？`)) return;
    try {
      const { default: api } = await import('../api/index.js');
      await Promise.all([...selectedIds].map(id => api.delete(`/${type}/${id}`)));
      setData(prev => ({ ...prev, [type]: prev[type].filter(item => !selectedIds.has(item.id)) }));
      setSelectedIds(new Set());
    } catch (err) { alert('批量删除失败'); }
  };

  const renderTable = (type) => {
    if (loading[type]) return renderLoading();
    if (error[type]) return renderError(type);
    if (data[type].length === 0) return renderEmpty();

    const allSelectedOnPage = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));

    return (
      <div className="overflow-x-auto">
        {selectedIds.size > 0 && (
          <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm">
            <span className="text-blue-700">已选 {selectedIds.size} 项</span>
            <div className="flex gap-2">
              <button onClick={() => handleBatchDelete(type)}
                className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-3 py-1 rounded">删除选中</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-gray-500 hover:text-gray-700 text-xs">取消选择</button>
            </div>
          </div>
        )}
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-3 w-8">
                <input type="checkbox" onChange={e => {
                  if (e.target.checked) setSelectedIds(new Set(paginatedItems.map(item => item.id)));
                  else setSelectedIds(new Set());
                }} checked={allSelectedOnPage} />
              </th>
              {type === 'users' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="username">用户名</SortTh>
                  <SortTh field="nickname">昵称</SortTh>
                  <SortTh field="email">邮箱</SortTh>
                  <SortTh field="createdAt">注册日期</SortTh>
                  <th className="px-4 py-3 text-gray-600 font-medium w-20">操作</th>
                </>
              )}
              {type === 'diaries' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="userId" className="w-20">用户ID</SortTh>
                  <SortTh field="userName">用户名</SortTh>
                  <SortTh field="title">标题</SortTh>
                  <th className="px-4 py-3 text-gray-600 font-medium">内容预览</th>
                  <SortTh field="likes" className="w-20">点赞</SortTh>
                  <SortTh field="createdAt">创建日期</SortTh>
                  <th className="px-4 py-3 text-gray-600 font-medium w-20">操作</th>
                </>
              )}
              {type === 'spots' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="name">名称</SortTh>
                  <SortTh field="city">城市</SortTh>
                  <SortTh field="type">类型</SortTh>
                  <SortTh field="rating" className="w-24">评分</SortTh>
                  <th className="px-4 py-3 text-gray-600 font-medium w-20">操作</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item, index) => (
              <tr key={item.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-2 py-3">
                  <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                      return next;
                    });
                  }} />
                </td>
                {type === 'users' && (
                  <>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{item.username}</td>
                    <td className="px-4 py-3 text-gray-700">{item.nickname || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        if (confirm(`确定删除用户 ${item.username}？`)) {
                          try {
                            const { default: api } = await import('../api/index.js');
                            await api.delete(`/users/${item.id}`);
                            setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== item.id) }));
                          } catch (err) { alert('删除失败'); }
                        }
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </>
                )}
                {type === 'diaries' && (
                  <>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs rounded">{item.userId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.userName || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">{item.title}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-sm truncate text-xs">{item.content || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-red-500 font-mono text-xs">
                        <Heart size={12} fill="#ef4444" /> {item.likes || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        if (confirm(`确定删除日记 ${item.title}？`)) {
                          try {
                            const { default: api } = await import('../api/index.js');
                            await api.delete(`/diaries/${item.id}`);
                            setData(prev => ({ ...prev, diaries: prev.diaries.filter(d => d.id !== item.id) }));
                          } catch (err) { alert('删除失败'); }
                        }
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </>
                )}
                {type === 'spots' && (
                  <>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded">{item.city || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.type || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {renderStars(item.rating)}
                        <span className="text-gray-500 text-xs font-mono">{item.rating || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        if (confirm(`确定删除景点 ${item.name}？`)) {
                          try {
                            const { default: api } = await import('../api/index.js');
                            await api.delete(`/spots/${item.id}`);
                            setData(prev => ({ ...prev, spots: prev.spots.filter(s => s.id !== item.id) }));
                          } catch (err) { alert('删除失败'); }
                        }
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 flex items-center justify-between text-sm rounded-lg">
          <div className="flex items-center gap-6 font-mono text-xs">
            <span className="text-gray-600">
              总计: <span className="text-gray-900 font-medium ml-1">{processedItems.length}</span>
            </span>
            {statistics.todayNew !== undefined && (
              <span className="text-gray-600">今日新增: <span className="text-green-600 font-medium ml-1">+{statistics.todayNew}</span></span>
            )}
            {statistics.totalLikes !== undefined && (
              <span className="text-gray-600">总点赞: <span className="text-red-500 font-medium ml-1">{statistics.totalLikes}</span></span>
            )}
            {statistics.avgRating !== undefined && (
              <span className="text-gray-600">平均评分: <span className="text-yellow-600 font-medium ml-1">{statistics.avgRating}</span></span>
            )}
            {searchQuery && (
              <span className="text-blue-600">筛选: <span className="font-medium ml-1">{processedItems.length}/{data[type].length}</span></span>
            )}
            <span className="text-gray-400">{timeAgo(lastRefresh)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-mono text-xs transition-colors border border-gray-300 px-3 py-1.5 hover:border-gray-400 rounded-lg bg-white">
              <Download size={12} /> 导出 CSV
            </button>
            <button onClick={() => {
              const allData = { users: data.users, diaries: data.diaries, spots: data.spots, groups, exportedAt: new Date().toISOString() };
              const blob = new Blob(['\ufeff' + JSON.stringify(allData, null, 2)], { type: 'application/json;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `全部数据-${new Date().toISOString().split('T')[0]}.json`; a.click();
              URL.revokeObjectURL(url);
            }}
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-mono text-xs transition-colors border border-gray-300 px-3 py-1.5 hover:border-gray-400 rounded-lg bg-white">
              📦 导出全部
            </button>
            <button onClick={() => { setData(prev => ({ ...prev, [type]: [] })); fetchData(type, true); }}
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-mono text-xs transition-colors border border-gray-300 px-3 py-1.5 hover:border-gray-400 rounded-lg bg-white">
              <RefreshCw size={12} /> 刷新
            </button>
          </div>
        </div>

        {renderPagination()}
      </div>
    );
  };

  const renderOverview = () => {
    const totalUsers = data.users?.length || 0;
    const totalDiaries = data.diaries?.length || 0;
    const totalSpots = data.spots?.length || 0;
    const totalGroups = groups.length || 0;
    const totalLikes = data.diaries?.reduce((s, d) => s + (d.likes || 0), 0) || 0;

    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        diaries: data.diaries?.filter(dd => dd.createdAt?.startsWith(dateStr)).length || 0,
        users: data.users?.filter(u => u.createdAt?.startsWith(dateStr)).length || 0,
      };
    });
    const maxCount = Math.max(1, ...last7.map(d => Math.max(d.diaries, d.users)));

    const topLiked = [...(data.diaries || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

    return (
      <div className="space-y-6">
        {insight && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 leading-relaxed">
            {insight}
          </div>
        )}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: '用户数', value: totalUsers, color: 'text-blue-600' },
            { label: '日记数', value: totalDiaries, color: 'text-purple-600' },
            { label: '景点数', value: totalSpots, color: 'text-green-600' },
            { label: '群组数', value: totalGroups, color: 'text-orange-600' },
            { label: '总点赞', value: totalLikes, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">近 7 日新增趋势</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {last7.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center" style={{ height: 100 }}>
                    <div className="w-4 bg-blue-400 rounded-t transition-all" style={{ height: `${(d.users / maxCount) * 100}%` }} title={`新增用户: ${d.users}`} />
                    <div className="w-4 bg-purple-400 rounded-t transition-all -mt-1" style={{ height: `${(d.diaries / maxCount) * 100}%` }} title={`新增日记: ${d.diaries}`} />
                  </div>
                  <span className="text-xs text-gray-400">{d.date}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" /> 用户</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-400" /> 日记</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">景点类型分布</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1.5">
            {(() => {
              const typeCounts = {};
              (data.spots || []).forEach(s => { const t = s.type || '未知'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
              const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
              const typeMax = Math.max(1, ...typeEntries.map(e => e[1]));
              return typeEntries.map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-gray-600 text-xs truncate">{type}</span>
                  <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${(count / typeMax) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-500">{count}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">点赞 Top 10</h3>
          <div className="space-y-1">
            {topLiked.length === 0 ? (
              <p className="text-sm text-gray-400">暂无数据</p>
            ) : topLiked.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 text-sm py-1">
                <span className={`w-5 text-center font-bold ${i < 3 ? 'text-orange-500' : 'text-gray-400'}`}>{i + 1}</span>
                <span className="text-gray-700 truncate flex-1">{d.title}</span>
                <span className="text-red-500 text-xs font-mono">❤️ {d.likes || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGroups = () => {
    if (loading['groups']) return renderLoading();
    if (error['groups']) return renderError('groups');

    if (groups.length === 0) return renderEmpty();
    return (
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id}>
            <div className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 cursor-pointer"
              onClick={async () => {
                const newId = expandedGroup === g.id ? null : g.id;
                setExpandedGroup(newId);
                if (newId && !groupDetails[newId]) {
                  try {
                    const { getGroup } = await import('../api/index.js');
                    const res = await getGroup(newId);
                    setGroupDetails(prev => ({ ...prev, [newId]: res.data?.data || {} }));
                  } catch {}
                }
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{g.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">码: {g.code} · {g.memberCount || '?'} 人 · {g.lastMessage ? `最新: ${g.lastMessage.substring(0, 30)}` : '暂无消息'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`transition-transform ${expandedGroup === g.id ? 'rotate-180' : ''}`}>▼</span>
                  <button onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('确定删除此群组？')) {
                      try {
                        const { deleteGroup } = await import('../api/index.js');
                        await deleteGroup(g.id);
                        setGroups(prev => prev.filter(x => x.id !== g.id));
                      } catch (err) { alert(err?.response?.data?.message || '删除失败'); }
                    }
                  }} className="text-xs text-red-500 hover:text-red-700 p-1">删除</button>
                </div>
              </div>
            </div>
            {expandedGroup === g.id && (
              <div className="border-x border-b border-gray-200 rounded-b-xl p-4 bg-gray-50 text-sm">
                {groupDetails[g.id] ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">成员 ({groupDetails[g.id].members?.length || 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {groupDetails[g.id].members?.map(m => (
                        <span key={m.user.id} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs">
                          <span>{m.user.avatar}</span>
                          <span>{m.user.nickname}</span>
                          {m.role === 'admin' && <span className="text-blue-500 text-[10px]">管理员</span>}
                        </span>
                      )) || <span className="text-xs text-gray-400">暂无成员信息</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">创建于 {formatDate(g.createdAt)}</p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 animate-pulse">加载中...</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderHealth = () => {
    const runScan = () => {
      const issues = [];

      data.diaries?.forEach(d => {
        if (!d.userId) issues.push({ type: 'diary', id: d.id, desc: `日记 #${d.id} 缺少用户关联`, fixable: 'delete' });
      });

      data.users?.forEach(u => {
        const count = data.diaries?.filter(d => d.userId === u.id).length || 0;
        if (count === 0) issues.push({ type: 'user', id: u.id, desc: `用户 ${u.nickname || u.username} 未发布任何日记`, fixable: null });
      });

      data.spots?.forEach(s => {
        if (!s.rating || s.rating === 0) issues.push({ type: 'spot', id: s.id, desc: `景点「${s.name}」评分为 0`, fixable: null });
      });

      // Check groups with 0 members
      groups?.forEach(g => {
        if (!g.memberCount || g.memberCount === 0) issues.push({ type: 'group', id: g.id, desc: `群组「${g.name}」没有成员`, fixable: null });
      });

      // Check spots with no tags
      data.spots?.forEach(s => {
        if (!s.tags || s.tags.length === 0) issues.push({ type: 'spot', id: s.id, desc: `景点「${s.name}」没有标签`, fixable: null });
      });

      setScanResult(issues);
    };

    const handleRepair = async (issue) => {
      if (issue.type === 'diary' && confirm(`确定删除日记 #${issue.id}？`)) {
        try {
          const { default: api } = await import('../api/index.js');
          await api.delete(`/diaries/${issue.id}`);
          setData(prev => ({ ...prev, diaries: prev.diaries.filter(d => d.id !== issue.id) }));
          setScanResult(prev => prev.filter(x => !(x.type === 'diary' && x.id === issue.id)));
        } catch (err) { alert('删除失败'); }
      }
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">扫描数据中的异常记录和潜在问题</p>
          <button onClick={runScan} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">🔍 一键扫描</button>
        </div>
        {scanResult === null ? (
          <p className="text-sm text-gray-400 text-center py-10">点击「一键扫描」开始检查</p>
        ) : scanResult.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-green-600">未发现数据问题</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">发现 {scanResult.length} 个问题</p>
            {scanResult.map((issue, i) => (
              <div key={i} className="flex items-center gap-3 text-sm border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-yellow-500">⚠️</span>
                <span className="flex-1 text-gray-700">{issue.desc}</span>
                {issue.fixable === 'delete' && (
                  <button onClick={() => handleRepair(issue)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded">删除修复</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderComments = () => {
    const allComments = [];
    (data.diaries || []).forEach(d => {
      (d.comments || []).forEach(c => {
        allComments.push({ ...c, diaryTitle: d.title, diaryId: d.id });
      });
    });
    const sorted = allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sorted.length === 0) return renderEmpty();

    const pageSize = 15;
    const totalPages = Math.ceil(sorted.length / pageSize);
    const validPage = Math.min(commentPage, totalPages);
    const paginated = sorted.slice((validPage - 1) * pageSize, validPage * pageSize);

    return (
      <div>
        <p className="text-xs text-gray-400 mb-3">共 {sorted.length} 条评论</p>
        <div className="space-y-2">
          {paginated.map((c, i) => (
            <div key={c.id || i} className="border border-gray-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-800">{c.userName}</span>
                <span className="text-xs text-gray-400">评论了</span>
                <span className="text-blue-600 text-xs truncate max-w-40">{c.diaryTitle}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatDate(c.createdAt)}</span>
              </div>
              <p className="text-gray-600 text-xs ml-1">{c.content}</p>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={() => setCommentPage(p => Math.max(1, p - 1))} disabled={validPage <= 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
            <span className="text-xs text-gray-500">{validPage} / {totalPages}</span>
            <button onClick={() => setCommentPage(p => Math.min(totalPages, p + 1))} disabled={validPage >= totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
          </div>
        )}
      </div>
    );
  };

  const DASHBOARD_VIEWS = ['📊 全局概览', '🏆 热门 TOP 5', '📈 分布透视', '📉 趋势分析'];

  const renderDashboardFullscreen = () => {
    const view = dashboardView;
    const totalU = data.users?.length || 0;
    const totalD = data.diaries?.length || 0;
    const totalS = data.spots?.length || 0;
    const totalG = groups.length || 0;
    const totalL = data.diaries?.reduce((s, d) => s + (d.likes || 0), 0) || 0;
    const totalC = data.diaries?.reduce((s, d) => s + (d.comments?.length || 0), 0) || 0;

    // Today
    const today = new Date().toISOString().split('T')[0];
    const todayU = data.users?.filter(u => u.createdAt?.startsWith(today)).length || 0;
    const todayD = data.diaries?.filter(d => d.createdAt?.startsWith(today)).length || 0;

    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white flex flex-col" onClick={() => setDashboardPaused(p => !p)}>
        {/* View content */}
        <div className="flex-1 flex items-center justify-center p-12">
          {view === 0 && (
            <div className="w-full max-w-5xl space-y-12">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">总览</div>
                <div className="text-lg text-blue-300/70">{todayU > 0 || todayD > 0 ? `今日 +${todayU} 用户 · +${todayD} 日记` : ''}</div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: '用户', value: totalU, color: 'from-blue-400 to-blue-600' },
                  { label: '日记', value: totalD, color: 'from-purple-400 to-purple-600' },
                  { label: '景点', value: totalS, color: 'from-green-400 to-green-600' },
                  { label: '群组', value: totalG, color: 'from-orange-400 to-orange-600' },
                  { label: '点赞', value: totalL, color: 'from-red-400 to-red-600' },
                  { label: '评论', value: totalC, color: 'from-teal-400 to-teal-600' },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-8 text-center shadow-2xl`}>
                    <div className="text-6xl font-black mb-2">{s.value}</div>
                    <div className="text-lg opacity-80">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 1 && (
            <div className="w-full max-w-5xl">
              <div className="text-4xl font-bold mb-8 text-center">🏆 热门 TOP 5</div>
              <div className="grid grid-cols-3 gap-6">
                {/* Top diaries by likes */}
                <div className="bg-white/10 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-yellow-400 mb-3">🔥 最热日记</div>
                  <div className="space-y-2">
                    {[...(data.diaries || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5).map((d, i) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center font-bold text-yellow-400">{i + 1}</span>
                        <span className="flex-1 truncate">{d.title}</span>
                        <span className="text-red-400">❤️ {d.likes}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top users by diaries */}
                <div className="bg-white/10 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-green-400 mb-3">👥 最活跃用户</div>
                  <div className="space-y-2">
                    {[...(data.users || [])].sort((a, b) => (b.totalDiaries || 0) - (a.totalDiaries || 0)).slice(0, 5).map((u, i) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center font-bold text-green-400">{i + 1}</span>
                        <span>{u.avatar}</span>
                        <span className="flex-1 truncate">{u.nickname}</span>
                        <span className="text-blue-400">{u.totalDiaries} 篇</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top spots by rating */}
                <div className="bg-white/10 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-purple-400 mb-3">⭐ 最高评分景点</div>
                  <div className="space-y-2">
                    {[...(data.spots || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-center font-bold text-purple-400">{i + 1}</span>
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-yellow-400">{'⭐'.repeat(Math.floor(s.rating || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 2 && (
            <div className="w-full max-w-5xl">
              <div className="text-4xl font-bold mb-8 text-center">📈 分布透视</div>
              <div className="grid grid-cols-2 gap-8">
                {/* Type distribution */}
                <div className="bg-white/10 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-blue-400 mb-4">景点类型</div>
                  <div className="space-y-3">
                    {Object.entries(data.spots?.reduce((acc, s) => { const t = s.type || '未知'; acc[t] = (acc[t] || 0) + 1; return acc; }, {}) || {})
                      .sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                      const max = Math.max(1, ...Object.values(data.spots?.reduce((acc, s) => { const t = s.type || '未知'; acc[t] = (acc[t] || 0) + 1; return acc; }, {}) || {}));
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="w-20 text-sm truncate">{type}</span>
                          <div className="flex-1 h-6 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-sm w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* City ranking */}
                <div className="bg-white/10 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-orange-400 mb-4">城市热度</div>
                  <div className="space-y-3">
                    {Object.entries(data.spots?.reduce((acc, s) => { const c = s.city || '未知'; acc[c] = (acc[c] || 0) + 1; return acc; }, {}) || {})
                      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count], i) => {
                      const max = Object.values(data.spots?.reduce((acc, s) => { const c = s.city || '未知'; acc[c] = (acc[c] || 0) + 1; return acc; }, {}) || {});
                      return (
                        <div key={city} className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-orange-400">{i + 1}</span>
                          <span className="w-24 text-sm truncate">{city}</span>
                          <div className="flex-1 h-5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full transition-all" style={{ width: `${(count / Math.max(...max)) * 100}%` }} />
                          </div>
                          <span className="text-sm w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 3 && (
            <div className="w-full max-w-5xl">
              <div className="text-4xl font-bold mb-8 text-center">📉 近 14 日趋势</div>
              <div className="bg-white/10 rounded-2xl p-8">
                {(() => {
                  const days = [];
                  for (let i = 13; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    const ds = d.toISOString().split('T')[0];
                    days.push({
                      label: `${d.getMonth() + 1}/${d.getDate()}`,
                      users: data.users?.filter(u => u.createdAt?.startsWith(ds)).length || 0,
                      diaries: data.diaries?.filter(dd => dd.createdAt?.startsWith(ds)).length || 0,
                    });
                  }
                  const maxVal = Math.max(1, ...days.flatMap(d => [d.users, d.diaries]));
                  return (
                    <div>
                      <div className="flex items-end gap-1" style={{ height: 200 }}>
                        {days.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                            <div className="w-3 bg-purple-400 rounded-t transition-all" style={{ height: `${(d.diaries / maxVal) * 180}%` }} title={`日记: ${d.diaries}`} />
                            <div className="w-3 bg-blue-400 rounded-t transition-all" style={{ height: `${(d.users / maxVal) * 180}%` }} title={`用户: ${d.users}`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-white/50">
                        {days.filter((_, i) => i % 3 === 0).map((d, i) => <span key={i}>{d.label}</span>)}
                        <span />
                      </div>
                      <div className="flex gap-4 mt-4 text-sm text-white/60">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> 用户</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-400" /> 日记</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-center gap-4 py-6 text-white/50 text-sm">
          {DASHBOARD_VIEWS.map((name, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setDashboardView(i); }}
              className={`px-3 py-1 rounded-full transition-all ${view === i ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}>
              {name}
            </button>
          ))}
          <span className="mx-2 text-white/20">|</span>
          <button onClick={e => { e.stopPropagation(); setDashboardPaused(p => !p); }} className="hover:text-white/80">
            {dashboardPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      if (!data.users || !data.diaries || !data.spots || data.users.length === 0) return renderSkeleton();
      return renderOverview();
    }
    if (activeTab === 'comments') return renderComments();
    if (activeTab === 'groups') return renderGroups();
    if (activeTab === 'health') return renderHealth();
    return renderTable(activeTab);
  };

  if (dashboardMode) return renderDashboardFullscreen();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">管理中心</h1>
              <p className="text-gray-500 text-sm">{TABS_LABELS[activeTab]}</p>
            </div>
            {activeTab === 'overview' && (
              <button onClick={async () => {
                if (!dashboardMode) {
                  try { await document.documentElement.requestFullscreen(); } catch {}
                  setDashboardMode(true);
                } else {
                  try { await document.exitFullscreen(); } catch {}
                  setDashboardMode(false);
                }
              }} className={`ml-auto text-sm px-4 py-1.5 rounded-lg border transition-colors ${
                dashboardMode ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
                {dashboardMode ? '退出大屏' : '📺 大屏'}
              </button>
            )}
          </div>
        </div>

        {activeTab !== 'overview' && activeTab !== 'health' && activeTab !== 'groups' && activeTab !== 'comments' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-gray-500 text-xs mb-1">总{statistics.label}数</div>
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
            </div>
            {statistics.todayNew !== undefined && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="text-gray-500 text-xs mb-1">今日新增</div>
                <div className="text-2xl font-bold text-green-600">+{statistics.todayNew}</div>
              </div>
            )}
            {statistics.totalLikes !== undefined && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="text-gray-500 text-xs mb-1">总点赞数</div>
                <div className="text-2xl font-bold text-red-500">{statistics.totalLikes}</div>
              </div>
            )}
            {statistics.avgRating !== undefined && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="text-gray-500 text-xs mb-1">平均评分</div>
                <div className="text-2xl font-bold text-yellow-600">{statistics.avgRating}</div>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
            {ALL_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {['users', 'diaries', 'spots'].includes(activeTab) && (
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1">
              <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={`搜索 ${TABS_LABELS[activeTab]}...`}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors rounded-lg placeholder-gray-400" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></div>
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
            {filterOptions.length > 0 && (
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-gray-300 text-gray-700 text-sm px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">全部分类</option>
                {filterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
