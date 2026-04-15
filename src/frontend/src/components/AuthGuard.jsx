/**
 * AuthGuard & 权限相关组件
 *
 * 导出:
 *   AuthGuard     — 权限守卫，无权限时显示 fallback 或引导登录
 *   LoginPrompt   — 内嵌"请登录"提示卡片
 *   GuestBanner   — 访客模式顶部提示条
 *   useRequireAuth — Hook，操作前检查权限，无权则弹出提示
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// ── AuthGuard ─────────────────────────────────────────────────
/**
 * @param {string}    permission   PERMISSIONS 中的权限名
 * @param {ReactNode} children     有权限时渲染
 * @param {ReactNode} fallback     无权限时渲染（默认 null）
 * @param {boolean}   showPrompt  无权限时显示登录引导卡（优先于 fallback）
 * @param {string}    promptMsg   登录引导提示文字
 */
export function AuthGuard({
  permission,
  children,
  fallback    = null,
  showPrompt  = false,
  promptMsg   = '登录后即可使用此功能',
}) {
  const { can } = useAuth();
  if (can(permission)) return children;
  if (showPrompt)       return <LoginPrompt message={promptMsg} />;
  return fallback;
}

// ── LoginPrompt ───────────────────────────────────────────────
export function LoginPrompt({ message = '登录后即可使用此功能', compact = false }) {
  if (compact) {
    return (
      <Link to="/auth"
        className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
        🔐 {message}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
        🔐
      </div>
      <div>
        <p className="text-gray-700 font-medium text-sm">{message}</p>
        <p className="text-gray-400 text-xs mt-1">登录后解锁完整旅行体验</p>
      </div>
      <div className="flex gap-2">
        <Link to="/auth"
          className="btn-primary text-sm">
          登录 / 注册
        </Link>
        <Link to="/auth?mode=guest"
          className="btn-outline text-sm">
          访客体验
        </Link>
      </div>
    </div>
  );
}

// ── GuestBanner ───────────────────────────────────────────────
export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-amber-700 flex items-center gap-1.5">
        <span>👤</span>
        <span>当前为<b>访客模式</b>，点赞、发帖、日记等互动功能需要登录</span>
      </span>
      <Link to="/auth"
        className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
        登录 / 注册
      </Link>
    </div>
  );
}

// ── useRequireAuth ────────────────────────────────────────────
/**
 * 操作前检查权限，无权限则跳转登录页
 *
 * const requireAuth = useRequireAuth();
 * <button onClick={() => requireAuth('like', () => handleLike())}>点赞</button>
 */
export function useRequireAuth() {
  const { can }  = useAuth();
  const navigate = useNavigate();

  return (permission, action) => {
    if (can(permission)) {
      action();
    } else {
      navigate('/auth?reason=required');
    }
  };
}
