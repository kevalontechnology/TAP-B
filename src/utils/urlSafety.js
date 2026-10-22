import { URL } from 'url';

/**
 * Validates whether a destination URL is safe to redirect to.
 * Blocks dangerous schemes (javascript:, data:, vbscript:, etc.),
 * localhost, private IP addresses (RFC1918), link-local addresses, and SSRF targets.
 *
 * @param {string} rawUrl 
 * @returns {{ safe: boolean, error?: string, sanitizedUrl?: string }}
 */
export function validateDestinationSafety(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, error: 'Destination URL is required' };
  }

  const trimmed = rawUrl.trim();

  // Basic regex check for dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { safe: false, error: 'Unsafe URL scheme detected' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err) {
    return { safe: false, error: 'Invalid URL format' };
  }

  // Must be http or https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { safe: false, error: 'Protocol must be http or https' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost and loopbacks
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    return { safe: false, error: 'Localhost and loopback destinations are forbidden' };
  }

  // Block IPv4 private address ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octets = match.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) {
      return { safe: false, error: 'Invalid IP address' };
    }
    const [o1, o2] = octets;
    if (
      o1 === 0 ||
      o1 === 10 ||
      o1 === 127 ||
      (o1 === 172 && o2 >= 16 && o2 <= 31) ||
      (o1 === 192 && o2 === 168) ||
      (o1 === 169 && o2 === 254)
    ) {
      return { safe: false, error: 'Private and internal IP ranges are forbidden' };
    }
  }

  return { safe: true, sanitizedUrl: trimmed };
}
