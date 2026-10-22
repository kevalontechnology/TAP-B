import { SystemSetting } from '../models/SystemSetting.js';
import { config } from '../config/env.js';

let cachedBaseUrl = null;
let lastFetchTime = 0;
let cachedProfileBaseUrl = null;
let lastProfileFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache

/**
 * Get current active Short URL Base URL configured by Admin
 */
export async function getActiveBaseUrl(req = null) {
  const now = Date.now();
  if (cachedBaseUrl && now - lastFetchTime < CACHE_TTL) {
    return cachedBaseUrl;
  }

  try {
    const setting = await SystemSetting.findOne({ key: 'PUBLIC_QR_BASE_URL' });
    if (setting && setting.value && typeof setting.value === 'string' && setting.value.trim() !== '') {
      cachedBaseUrl = setting.value.trim().replace(/\/+$/, '');
      lastFetchTime = now;
      return cachedBaseUrl;
    }
  } catch (err) {
    console.error('[BaseUrlHelper] Failed to read setting from DB:', err.message);
  }

  // Fallback to environment variable
  if (config.publicQrBaseUrl) {
    cachedBaseUrl = config.publicQrBaseUrl.trim().replace(/\/+$/, '');
    lastFetchTime = now;
    return cachedBaseUrl;
  }

  // Fallback to request host
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host) {
      cachedBaseUrl = `${proto}://${host}`.replace(/\/+$/, '');
      lastFetchTime = now;
      return cachedBaseUrl;
    }
  }

  return 'https://qr.tapzy.in';
}

/**
 * Set active Short URL Base URL by Admin
 */
export async function setActiveBaseUrl(url, userId = null) {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('Base URL must begin with http:// or https://');
  }

  await SystemSetting.findOneAndUpdate(
    { key: 'PUBLIC_QR_BASE_URL' },
    {
      key: 'PUBLIC_QR_BASE_URL',
      value: cleanUrl,
      description: 'Configurable Short URL Base Domain for Dynamic QR Code generation and redirection',
      updatedBy: userId,
    },
    { upsert: true, new: true }
  );

  cachedBaseUrl = cleanUrl;
  lastFetchTime = Date.now();
  return cleanUrl;
}

/**
 * Get active Public Profile Base URL configured by Admin
 */
export async function getActiveProfileBaseUrl(req = null) {
  const now = Date.now();
  if (cachedProfileBaseUrl && now - lastProfileFetchTime < CACHE_TTL) {
    return cachedProfileBaseUrl;
  }

  try {
    const setting = await SystemSetting.findOne({ key: 'PUBLIC_PROFILE_BASE_URL' });
    if (setting && setting.value && typeof setting.value === 'string' && setting.value.trim() !== '') {
      cachedProfileBaseUrl = setting.value.trim().replace(/\/+$/, '');
      lastProfileFetchTime = now;
      return cachedProfileBaseUrl;
    }
  } catch (err) {
    console.error('[BaseUrlHelper] Failed to read profile setting from DB:', err.message);
  }

  // Fallback to env or host
  if (process.env.PUBLIC_PROFILE_BASE_URL) {
    cachedProfileBaseUrl = process.env.PUBLIC_PROFILE_BASE_URL.trim().replace(/\/+$/, '');
    lastProfileFetchTime = now;
    return cachedProfileBaseUrl;
  }

  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host) {
      cachedProfileBaseUrl = `${proto}://${host}`.replace(/\/+$/, '');
      lastProfileFetchTime = now;
      return cachedProfileBaseUrl;
    }
  }

  return 'https://profile.tapzy.in';
}

/**
 * Set active Public Profile Base URL by Admin
 */
export async function setActiveProfileBaseUrl(url, userId = null) {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('Profile Base URL must begin with http:// or https://');
  }

  await SystemSetting.findOneAndUpdate(
    { key: 'PUBLIC_PROFILE_BASE_URL' },
    {
      key: 'PUBLIC_PROFILE_BASE_URL',
      value: cleanUrl,
      description: 'Configurable Public Profile Base Domain for Tapzy Digital Profiles and NFC/QR sharing',
      updatedBy: userId,
    },
    { upsert: true, new: true }
  );

  cachedProfileBaseUrl = cleanUrl;
  lastProfileFetchTime = Date.now();
  return cleanUrl;
}
