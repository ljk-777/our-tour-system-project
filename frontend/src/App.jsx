import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth }  from './context/AuthContext.jsx';
import { getStoredUser, isGuestMode } from './hooks/useAuth.js';

/** ScrollToTop — 路由切换时自动滚动到顶部 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// 布局
import Navbar  from './components/Navbar.jsx';
import { FooterFull, MobileBottomNav } from './components/Footer.jsx';

// 全屏页（无标准 Navbar/Footer）
import Auth    from './pages/Auth.jsx';
import Explore from './pages/Explore.jsx';

// 标准页
import Home         from './pages/Home.jsx';
import Spots        from './pages/Spots.jsx';
import SpotDetail   from './pages/SpotDetail.jsx';
import RoutePlanner from './pages/RoutePlanner.jsx';
import Diary        from './pages/Diary.jsx';
import Plaza        from './pages/Plaza.jsx';
import Profile      from './pages/Profile.jsx';
import AlgoDemo     from './pages/AlgoDemo.jsx';
import Admin        from './pages/Admin.jsx';
import Foods        from './pages/Foods.jsx';

/**
 * ProtectedRoute — 需要登录或访客身份才能访问
 * 未进入任何身份（直接粘贴 URL 访问）→ 重定向到 /auth
 */
function ProtectedRoute({ children }) {
  const hasAuth = getStoredUser() || isGuestMode();
  return hasAuth ? children : <Navigate to="/auth" replace />;
}

/**
 * GuestBanner — 访客模式顶部提示条
 */
function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;
  return (
    <div style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))', borderBottom: '1px solid rgba(245,158,11,0.15)' }}
      className="px-4 py-2.5 flex items-center justify-between text-sm">
      <span className="flex items-center gap-2" style={{ color: '#fcd34d' }}>
        <span>👤</span>
        <span>当前为<b>访客模式</b>，可浏览内容，但点赞、评论、发帖等功能需要</span>
        <Link to="/auth" className="underline hover:no-underline font-semibold">登录</Link>
      </span>
      <Link to="/auth" className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
        style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>
        登录 / 注册
      </Link>
    </div>
  );
}

/**
 * StandardLayout — 带 Navbar + Footer 的标准页布局
 */
function StandardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070b18' }}>
      <Navbar />
      <GuestBanner />
      <main className="flex-1 pb-14 lg:pb-0">
        {children}
      </main>
      <FooterFull />
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* ── 认证入口（全屏，无 Navbar）──────────────── */}
          <Route path="/auth"  element={<Auth />} />
          <Route path="/login" element={<Auth />} />   {/* 向后兼容 */}

          {/* ── 探索主界面（需要身份）──────────────────── */}
          <Route path="/explore" element={
            <ProtectedRoute><Explore /></ProtectedRoute>
          } />

          {/* ── 标准页（带 Navbar，全部公开可访问）─────── */}
          <Route path="/"          element={<StandardLayout><Home /></StandardLayout>} />
          <Route path="/spots"     element={<StandardLayout><Spots /></StandardLayout>} />
          <Route path="/spots/:id" element={<StandardLayout><SpotDetail /></StandardLayout>} />
          <Route path="/route"     element={<StandardLayout><RoutePlanner /></StandardLayout>} />
          <Route path="/diary"     element={<StandardLayout><Diary /></StandardLayout>} />
          <Route path="/plaza"     element={<StandardLayout><Plaza /></StandardLayout>} />
          <Route path="/profile"   element={<StandardLayout><Profile /></StandardLayout>} />
          <Route path="/algo"      element={<StandardLayout><AlgoDemo /></StandardLayout>} />
          <Route path="/admin"     element={<StandardLayout><Admin /></StandardLayout>} />
          <Route path="/foods"     element={<StandardLayout><Foods /></StandardLayout>} />

          {/* ── 404 ──────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
