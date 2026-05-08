import { useState, useEffect, useMemo } from 'react';
import { getUsers, getDiaries, getSpots } from '../api/index.js';

const TABS = ['users', 'diaries', 'spots'];
const TAB_LABELS = { users: '用户 (Users)', diaries: '日记 (Diaries)', spots: '景点 (Spots)' };

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState({ users: [], diaries: [], spots: [] });
  const [loading, setLoading] = useState({ users: false, diaries: false, spots: false });
  const [error, setError] = useState({ users: null, diaries: null, spots: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 加载数据
  const fetchData = async (type, forceRefresh = false) => {
    if (!forceRefresh && data[type].length > 0) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    setError(prev => ({ ...prev, [type]: null }));

    try {
      let result;
      if (type === 'users') {
        result = await getUsers();
      } else if (type === 'diaries') {
        result = await getDiaries({ limit: 1000 });
      } else if (type === 'spots') {
        result = await getSpots({ limit: 1000 });
      }

      const fetchedData = result?.data?.data || [];
      setData(prev => ({ ...prev, [type]: fetchedData }));
    } catch (err) {
      setError(prev => ({ ...prev, [type]: err.message || '加载失败' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // 切换标签页
  useEffect(() => {
    fetchData(activeTab);
    setSearchQuery('');
    setCurrentPage(1);
  }, [activeTab]);

  // 初始加载
  useEffect(() => {
    fetchData('users');
  }, []);

  // 搜索处理
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // 实时搜索过滤
  const filteredItems = useMemo(() => {
    const items = data[activeTab];
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item => {
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
  }, [activeTab, data, searchQuery]);

  // 分页计算
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const validCurrentPage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  // 页码生成（最多显示5个页码）
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // 统计数据
  const statistics = useMemo(() => {
    const items = data[activeTab];
    const today = new Date().toISOString().split('T')[0];

    if (activeTab === 'users') {
      const todayNew = items.filter(u => u.created_at?.startsWith(today)).length;
      return { total: items.length, todayNew, label: '用户' };
    } else if (activeTab === 'diaries') {
      const todayNew = items.filter(d => d.created_at?.startsWith(today)).length;
      const totalLikes = items.reduce((sum, d) => sum + (d.likes_count || 0), 0);
      return { total: items.length, todayNew, totalLikes, label: '日记' };
    } else if (activeTab === 'spots') {
      const avgRating = items.length > 0
        ? (items.reduce((sum, s) => sum + (s.rating || 0), 0) / items.length).toFixed(1)
        : 0;
      return { total: items.length, avgRating, label: '景点' };
    }
    return { total: 0, label: '' };
  }, [activeTab, data]);

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 渲染星星
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= fullStars ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  // 加载状态
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

  // 错误状态
  const renderError = (type) => (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">⚠</div>
      <p className="text-red-500 font-mono font-medium">加载失败</p>
      <p className="text-sm text-gray-500 mt-2 font-mono">{error[type]}</p>
      <button
        onClick={() => fetchData(type, true)}
        className="mt-4 px-6 py-2 bg-white border border-gray-300 text-gray-700 font-mono text-sm hover:bg-gray-50 hover:border-gray-400 transition-all rounded-lg"
      >
        重新加载
      </button>
    </div>
  );

  // 空状态
  const renderEmpty = () => (
    <div className="text-center py-20">
      <div className="text-6xl mb-4 opacity-30">∅</div>
      <p className="text-gray-500 font-mono">暂无数据</p>
      <p className="text-sm text-gray-400 mt-2">当前数据集为空，请尝试刷新或检查数据源</p>
    </div>
  );

  // 分页组件
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600">
          第 <span className="font-medium text-gray-900">{currentPage}</span> 页，共
          <span className="font-medium text-gray-900">{totalPages}</span> 页
          <span className="text-gray-400 ml-2">
            (共 {filteredItems.length} 条)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            ← 上一页
          </button>

          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            下一页 →
          </button>
        </div>
      </div>
    );
  };

  // 渲染表格 - 浅色主题风格
  const renderTable = (type) => {
    const isLoading = loading[type];
    const err = error[type];

    if (isLoading) return renderLoading();
    if (err) return renderError(type);
    if (data[type].length === 0) return renderEmpty();

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {type === 'users' && (
                <>
                  <th className="px-4 py-3 text-gray-600 font-medium">ID</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">用户名</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">昵称</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">邮箱</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">注册日期</th>
                </>
              )}
              {type === 'diaries' && (
                <>
                  <th className="px-4 py-3 text-gray-600 font-medium">ID</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">用户ID</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">用户名</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">标题</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">内容预览</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">点赞</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">创建日期</th>
                </>
              )}
              {type === 'spots' && (
                <>
                  <th className="px-4 py-3 text-gray-600 font-medium">ID</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">名称</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">城市</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">类型</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">评分</th>
                  <th className="px-4 py-3 text-gray-600 font-medium">地址</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item, index) => (
              <tr
                key={item.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
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
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs rounded">
                        {item.user_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.user_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">{item.title}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-sm truncate text-xs">
                      {item.content || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-red-500 font-mono text-xs">
                        ♥ {item.likes_count || 0}
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
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded">
                        {item.city || '-'}
                      </span>
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

        {/* 数据汇总与操作栏 */}
        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 flex items-center justify-between text-sm rounded-lg">
          <div className="flex items-center gap-6 font-mono text-xs">
            <span className="text-gray-600">
              总计: <span className="text-gray-900 font-medium ml-1">{filteredItems.length}</span>
            </span>
            {statistics.todayNew !== undefined && (
              <span className="text-gray-600">
                今日新增: <span className="text-green-600 font-medium ml-1">+{statistics.todayNew}</span>
              </span>
            )}
            {statistics.totalLikes !== undefined && (
              <span className="text-gray-600">
                总点赞: <span className="text-red-500 font-medium ml-1">{statistics.totalLikes}</span>
              </span>
            )}
            {statistics.avgRating !== undefined && (
              <span className="text-gray-600">
                平均评分: <span className="text-yellow-600 font-medium ml-1">{statistics.avgRating}</span>
              </span>
            )}
            {searchQuery && (
              <span className="text-blue-600">
                筛选: <span className="font-medium ml-1">{filteredItems.length}/{data[type].length}</span>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setData(prev => ({ ...prev, [type]: [] }));
              fetchData(type, true);
            }}
            className="text-gray-600 hover:text-gray-900 font-mono text-xs transition-colors border border-gray-300 px-3 py-1.5 hover:border-gray-400 rounded-lg bg-white"
          >
            刷新数据
          </button>
        </div>

        {/* 分页组件（替代原来的返回顶部按钮） */}
        {renderPagination()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            数据管理
          </h1>
          <p className="text-gray-500 text-sm">
            {TAB_LABELS[activeTab]}
          </p>
        </div>

        {/* 统计卡片 */}
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

        {/* 标签页切换 */}
        <div className="mb-6">
          <div className="flex gap-0 border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {TAB_LABELS[tab]}
                {loading[tab] && (
                  <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent animate-spin align-middle"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={`搜索 ${TAB_LABELS[activeTab]}...`}
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors rounded-lg placeholder-gray-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</div>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 数据表格区域 */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          {renderTable(activeTab)}
        </div>
      </div>
    </div>
  );
}
