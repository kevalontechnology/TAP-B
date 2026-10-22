import rateLimit from 'express-rate-limit';

// Standard API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});

// Strict limiter for auth endpoints (login, password change)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// Redirect limiter (high throughput for scanning, but blocks abuse)
export const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 scans per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.',
});
