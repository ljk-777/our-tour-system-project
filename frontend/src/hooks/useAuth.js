/**
 * useAuth — 向后兼容的转发层
 *
 * 所有 import { useAuth } from '../hooks/useAuth.js' 的地方
 * 不需要改任何代码，直接从 AuthContext 获取状态。
 *
 * getStoredUser() 仅供 App.jsx 的 ProtectedRoute 同步读取（无 context 时）。
 */

export { useAuth } from '../context/AuthContext.jsx';

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('tour_auth_user')) || null; }
  catch { return null; }
}

export function isGuestMode() {
  return !getStoredUser() && !!localStorage.getItem('tour_guest_mode');
}
