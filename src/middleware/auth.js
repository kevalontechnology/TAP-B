import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      token = authHeader;
    }

    // 2. Check query parameter (e.g. ?token=... for downloads & images)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    // 3. Check custom header
    if (!token && req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    // 4. In development mode, auto-fallback to seeded admin if no token provided or dev-token
    if (!token || token === 'dev-token') {
      if (config.env === 'development') {
        const devUser =
          (await User.findOne({ email: 'admin@tapzy.in' })) ||
          (await User.findOne({ role: { $in: ['SUPER_ADMIN', 'ADMIN', 'admin'] } })) ||
          (await User.findOne());
        if (devUser) {
          req.user = devUser;
          return next();
        }
      }

      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or session invalid',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
    }

    // In development mode, fallback to dev admin on invalid token instead of breaking
    if (config.env === 'development') {
      const devUser = await User.findOne({ email: 'admin@tapzy.in' });
      if (devUser) {
        req.user = devUser;
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
    });
  }
}

/**
 * RBAC authorization middleware
 * @param {string[]} roles - Allowed roles e.g. ['SUPER_ADMIN', 'ADMIN']
 */
export function requireRole(...roleArgs) {
  const roles = Array.isArray(roleArgs[0]) ? roleArgs[0] : roleArgs;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userRole = (req.user.role || '').toUpperCase().replace(/\s+/g, '_');
    const normalizedRoles = roles.map((r) => String(r).toUpperCase().replace(/\s+/g, '_'));

    if (!normalizedRoles.includes(userRole) && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${roles.join(', ')}`,
      });
    }

    next();
  };
}
