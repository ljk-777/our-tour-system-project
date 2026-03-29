/**
 * AuthContext — 全局认证 & 权限状态管理
 *
 * ─── 三种身份 ────────────────────────────────────────────────
 *   none   → 未进入（仅访问了 /auth 登录页）
 *   guest  → 免登录进入，可浏览基础内容，不可互动
 *   user   → 已登录，完整权限
 *
 * ─── 升级路线 ────────────────────────────────────────────────
 *   Phase 1: localStorage + 内存状态
 *   Phase 2: 替换为 JWT refresh token + Axios interceptor
 *   Phase 3: 替换为 OAuth2 / 第三方登录
 *   只需修改此文件中的 login / logout / register 实现，
 *   所有消费方（useAuth, AuthGuard, Navbar...）无需改动
 * ─────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/index.js';

const AUTH_KEY  = 'tour_auth_user';
const GUEST_KEY = 'tour_guest_mode';

// ── 权限列表 ──────────────────────────────────────────────────
export const PERMISSIONS = {
  // 访客 + 登录用户均可
  BROWSE:         'browse',
  SEARCH:         'search',
  PLAN_ROUTE:     'plan_route',
  VIEW_SPOTS:     'view_spots',
  VIEW_DIARY:     'view_diary',       // 只读摘要

  // 仅登录用户
  LIKE:           'like',
  COMMENT:        'comment',
  COLLECT:        'collect',
  PUBLISH_DIARY:  'publish_diary',
  PUBLISH_POST:   'publish_post',
  MANAGE_PROFILE: 'manage_profile',
  GROUP:          'group',
};

const GUEST_PERMS = new Set([
  PERMISSIONS.BROWSE,
  PERMISSIONS.SEARCH,
  PERMISSIONS.PLAN_ROUTE,
  PERMISSIONS.VIEW_SPOTS,
  PERMISSIONS.VIEW_DIARY,
]);

const USER_PERMS = new Set(Object.values(PERMISSIONS));

// ── 工具：从 localStorage 恢复状态 ────────────────────────────
function loadUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
  catch { return null; }
}
function loadGuest() {
  return !loadUser() && !!localStorage.getItem(GUEST_KEY);
}

// ── Context 定义 ──────────────────────────────────────────────
export const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(loadUser);
  const [isGuest, setIsGuest] = useState(loadGuest);

  // 角色: 'user' | 'guest' | 'none'
  const role      = user ? 'user' : (isGuest ? 'guest' : 'none');
  const isLoggedIn = !!user;

  /** 判断当前身份是否拥有某项权限 */
  const can = useCallback((permission) => {
    if (user)    return USER_PERMS.has(permission);
    if (isGuest) return GUEST_PERMS.has(permission);
    return false;
  }, [user, isGuest]);

  /** 登录：调用 API，保存到 localStorage */
  const login = useCallback(async (username) => {
    const res = await apiLogin({ username });
    const payload = trimUser(res.data.data);
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    localStorage.removeItem(GUEST_KEY);
    setUser(payload);
    setIsGuest(false);
    return payload;
  }, []);

  /** 注册：调用 API，自动登录 */
  const register = useCallback(async (username, nickname) => {
    const res = await apiRegister({ username, nickname: nickname || username });
    const payload = trimUser(res.data.data);
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    localStorage.removeItem(GUEST_KEY);
    setUser(payload);
    setIsGuest(false);
    return payload;
  }, []);

  /** 免登录进入（访客模式） */
  const enterAsGuest = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.setItem(GUEST_KEY, '1');
    setUser(null);
    setIsGuest(true);
  }, []);

  /** 退出登录 */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    setIsGuest(false);
  }, []);

  /** 直接注入用户（供外部 demo 模式使用） */
  const setUserDirect = useCallback((userData) => {
    const payload = trimUser(userData);
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    localStorage.removeItem(GUEST_KEY);
    setUser(payload);
    setIsGuest(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, role, isLoggedIn, isGuest,
      can, login, register, enterAsGuest, logout, setUserDirect,
      PERMISSIONS,  // 方便子组件直接使用
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth hook ──────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}

// ── 内部工具 ──────────────────────────────────────────────────
function trimUser(u) {
  if (!u) return null;
  return {
    id:       u.id,
    username: u.username,
    nickname: u.nickname || u.username,
    avatar:   u.avatar   || '🧭',
    city:     u.city     || '',
    level:    u.level    || '旅行者',
  };
}
