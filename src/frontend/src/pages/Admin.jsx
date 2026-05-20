import { useState, useEffect, useMemo } from 'react';
import { getUsers, getDiaries, getSpots } from '../api/index.js';
import {
  Search, X, Download, RefreshCw, ArrowUpDown,
  ChevronLeft, ChevronRight, Heart, Star,
  AlertTriangle, Inbox
} from 'lucide-react';

const TABS = ['users', 'diaries', 'spots'];
const TAB_LABELS = { users: '用户 (Users)', diaries: '日记 (Diaries)', spots: '景点 (Spots)' };

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState({ users: [], diaries: [], spots: [] });
  const [loading, setLoading] = useState({ users: false, diaries: false, spots: false });
  const [error, setError] = useState({ users: null, diaries: null, spots: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const pageSize = 20;

  const fetchData = async (type, forceRefresh = false) => {
    if (!forceRefresh && data[type].length > 0) return;
    setLoading(prev => ({ ...prev, [type]: true }));
    setError(prev => ({ ...prev, [type]: null }));
    try {
      let result;
      if (type === 'users') result = await getUsers();
      else if (type === 'diaries') result = await getDiaries({ limit: 1000 });
      else if (type === 'spots') result = await getSpots({ limit: 1000 });
      const fetchedData = result?.data?.data || [];
      setData(prev => ({ ...prev, [type]: fetchedData }));
      setLastRefresh(new Date());
    } catch (err) {
      setError(prev => ({ ...prev, [type]: err.message || '加载失败' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    fetchData(activeTab);
    setSearchQuery('');
    setCurrentPage(1);
    setTypeFilter('');
    setSortField(null);
  }, [activeTab]);

  useEffect(() => {
    fetchData('users');
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Get unique filter options from full dataset
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

  // Apply search + type filter, then sort
  const processedItems = useMemo(() => {
    let items = data[activeTab] || [];
    const query = searchQuery.trim().toLowerCase();

    // Filter by search
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
            item.user_name?.toLowerCase().includes(query) ||
            String(item.id).includes(query) ||
            String(item.user_id).includes(query)
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

    // Filter by type/tag
    if (typeFilter) {
      if (activeTab === 'spots') {
        items = items.filter(s => s.type === typeFilter);
      } else if (activeTab === 'diaries') {
        items = items.filter(d => (d.tags || []).includes(typeFilter));
      }
    }

    // Sort
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
      const todayNew = items.filter(u => u.created_at?.startsWith(today)).length;
      return { total: items.length, todayNew, label: '用户' };
    } else if (activeTab === 'diaries') {
      const todayNew = items.filter(d => d.created_at?.startsWith(today)).length;
      const totalLikes = items.reduce((s, d) => s + (d.likes_count || 0), 0);
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
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={12} fill={i <= full ? '#facc15' : '#d1d5db'} className={i <= full ? 'text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
    );
  };

  // CSV export
  const exportCSV = () => {
    const items = processedItems;
    if (items.length === 0) return;
    let csv = '';
    if (activeTab === 'users') {
      csv = 'ID,用户名,昵称,邮箱,注册日期\n' +
        items.map(u =>
          `${u.id},"${u.username || ''}","${u.nickname || ''}","${u.email || ''}","${formatDate(u.created_at)}"`
        ).join('\n');
    } else if (activeTab === 'diaries') {
      csv = 'ID,用户ID,用户名,标题,点赞,创建日期\n' +
        items.map(d =>
          `${d.id},${d.user_id || ''},"${d.user_name || ''}","${(d.title || '').replace(/"/g,'""')}",${d.likes_count || 0},"${formatDate(d.created_at)}"`
        ).join('\n');
    } else if (activeTab === 'spots') {
      csv = 'ID,名称,城市,类型,评分,地址\n' +
        items.map(s =>
          `${s.id},"${s.name || ''}","${s.city || ''}","${s.type || ''}",${s.rating || 0},"${(s.address || '').replace(/"/g,'""')}"`
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

  // Format relative time
  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return '刚刚更新';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前更新`;
    return `${Math.floor(diff / 3600)} 小时前更新`;
  };

  // ── Sortable header helper ──
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

  // ── Loading ──
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

  // ── Error ──
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

  // ── Empty ──
  const renderEmpty = () => (
    <div className="text-center py-20">
      <div className="flex justify-center mb-4 opacity-30"><Inbox size={48} className="text-gray-400" /></div>
      <p className="text-gray-500 font-mono">暂无数据</p>
      <p className="text-sm text-gray-400 mt-2">当前数据集为空，请尝试刷新或检查数据源</p>
    </div>
  );

  // ── Pagination ──
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

  // ── Table ──
  const renderTable = (type) => {
    if (loading[type]) return renderLoading();
    if (error[type]) return renderError(type);
    if (data[type].length === 0) return renderEmpty();

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {type === 'users' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="username">用户名</SortTh>
                  <SortTh field="nickname">昵称</SortTh>
                  <SortTh field="email">邮箱</SortTh>
                  <SortTh field="created_at">注册日期</SortTh>
                </>
              )}
              {type === 'diaries' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="user_id" className="w-20">用户ID</SortTh>
                  <SortTh field="user_name">用户名</SortTh>
                  <SortTh field="title">标题</SortTh>
                  <th className="px-4 py-3 text-gray-600 font-medium">内容预览</th>
                  <SortTh field="likes_count" className="w-20">点赞</SortTh>
                  <SortTh field="created_at">创建日期</SortTh>
                </>
              )}
              {type === 'spots' && (
                <>
                  <SortTh field="id" className="w-16">ID</SortTh>
                  <SortTh field="name">名称</SortTh>
                  <SortTh field="city">城市</SortTh>
                  <SortTh field="type">类型</SortTh>
                  <SortTh field="rating" className="w-24">评分</SortTh>
                  <SortTh field="address">地址</SortTh>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item, index) => (
              <tr key={item.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}>
                {type === 'users' && (
                  <>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{item.username}</td>
                    <td className="px-4 py-3 text-gray-700">{item.nickname || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.created_at)}</td>
                  </>
                )}
                {type === 'diaries' && (
                  <>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs rounded">{item.user_id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.user_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">{item.title}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-sm truncate text-xs">{item.content || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-red-500 font-mono text-xs">
                        <Heart size={12} fill="#ef4444" /> {item.likes_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.created_at)}</td>
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
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs">{item.address || '-'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary bar */}
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">数据管理</h1>
          <p className="text-gray-500 text-sm">{TAB_LABELS[activeTab]}</p>
        </div>

        {/* Stats cards */}
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

        {/* Tab navigation */}
        <div className="mb-6">
          <div className="flex gap-0 border-b border-gray-200">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}>
                {TAB_LABELS[tab]}
                {loading[tab] && (
                  <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent animate-spin align-middle"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter row */}
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={`搜索 ${TAB_LABELS[activeTab]}...`}
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

        {/* Table */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          {renderTable(activeTab)}
        </div>
      </div>
    </div>
  );
}
