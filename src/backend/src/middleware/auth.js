/**
 * Auth middleware — reads user identity from x-user-id header.
 *
 * This is the ONLY place where user identity enters the system.
 * Downstream routes read req.user.id — they NEVER trust req.body.userId.
 */
function auth(req, res, next) {
  const userId = req.headers['x-user-id'];
  req.user = userId ? { id: Number(userId) } : null;
  next();
}

/** Require authenticated user — returns 401 if no user identity */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }
  next();
}

module.exports = { auth, requireAuth };
