import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tapzy_qr_db',
  jwtSecret: process.env.JWT_SECRET || 'tapzy_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  publicQrBaseUrl: process.env.PUBLIC_QR_BASE_URL || 'http://localhost:5000',
  useInMemoryDb: process.env.USE_IN_MEMORY_DB || 'auto',
  supportPhone: process.env.SUPPORT_PHONE || '+91 98765 43210',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@tapzy.in',
  supportWhatsApp: process.env.SUPPORT_WHATSAPP || '+919876543210',
};
