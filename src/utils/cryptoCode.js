import crypto from 'crypto';

// Characters excluding ambiguous characters (0, O, I, l) for high readability
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Generate a cryptographically secure random code
 * @param {number} length Default length 8
 * @param {string} prefix Optional prefix e.g. 'KT'
 * @returns {string} e.g. KT8x92Ab
 */
export function generatePublicCode(length = 8, prefix = 'KT') {
  const randomBytes = crypto.randomBytes(length);
  let code = prefix;
  for (let i = 0; i < length - prefix.length; i++) {
    const byte = randomBytes[i];
    code += CHARSET[byte % CHARSET.length];
  }
  return code;
}

/**
 * Generate a unique batch ID
 */
export function generateBatchId(prefix = 'BATCH') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
