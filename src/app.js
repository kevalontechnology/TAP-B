import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminProfileRoutes from './routes/adminProfileRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import publicProfileRoutes from './routes/publicProfileRoutes.js';
import { trackLinkAndRedirect, downloadPublicVcf, getPublicProfileData, handlePublicProfileView } from './controllers/publicProfileController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline styles & scripts for branded redirect templates
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development or if matches frontendUrl
      if (
        config.env === 'development' ||
        origin === config.frontendUrl ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'x-access-token', 'X-Requested-With', 'Accept', 'Origin'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Dynamic Public QR Redirect Engine: GET /q/:publicCode
app.use('/q', redirectRoutes);

// 2. Tracked Social Link Redirection Engine: GET /t/link/:profileId/:platform
app.get('/t/link/:profileId/:platform', trackLinkAndRedirect);

// 3. Public Profile & vCard Web Handlers: GET /p/:username & GET /p/:username/vcf
app.get('/p/:username/vcf', downloadPublicVcf);
app.get('/p/:username', handlePublicProfileView);

// 4. Protected & Public REST APIs
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/admin/settings', settingRoutes);
app.use('/api/admin/profiles', adminProfileRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/public', publicProfileRoutes);

// 5. Root-level Public Profile & vCard Handlers (e.g. https://tap-b.onrender.com/:username)
const RESERVED_PREFIXES = new Set([
  'api',
  'q',
  't',
  'p',
  'uploads',
  'health',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

app.get('/:username/vcf', (req, res, next) => {
  if (RESERVED_PREFIXES.has(req.params.username.toLowerCase())) return next();
  return downloadPublicVcf(req, res, next);
});

app.get('/:username', (req, res, next) => {
  if (RESERVED_PREFIXES.has(req.params.username.toLowerCase())) return next();
  return handlePublicProfileView(req, res, next);
});

// 404 for unhandled API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);
