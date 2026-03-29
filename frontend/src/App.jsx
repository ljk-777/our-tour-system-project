import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext.jsx';
import { getStoredUser, isGuestMode } from './hooks/useAuth.js';

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

/**
 * ProtectedRoute — 需要登录或访客身份才能访问
 * 未进入任何身份（直接粘贴 URL 访问）→ 重定向到 /auth
 */
function ProtectedRoute({ children }) {
  const hasAuth = getStoredUser() || isGuestMode();
  return hasAuth ? children : <Navigate to="/auth" replace />;
}

/**
 * StandardLayout — 带 Navbar + Footer 的标准页布局
 */
function StandardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070b18' }}>
      <Navbar />
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

          {/* ── 404 ──────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
