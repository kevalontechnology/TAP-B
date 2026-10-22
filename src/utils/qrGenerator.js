import QRCode from 'qrcode';

/**
 * Generate QR code as PNG Buffer
 * @param {string} text - The permanent short URL to encode
 * @param {object} options - styling options
 * @returns {Promise<Buffer>}
 */
export async function generateQrPngBuffer(text, options = {}) {
  const {
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    width = 1024,
    margin = 2,
    errorCorrectionLevel = 'H',
  } = options;

  return QRCode.toBuffer(text, {
    type: 'png',
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });
}

/**
 * Generate QR code as SVG string
 * @param {string} text - The permanent short URL to encode
 * @param {object} options - styling options
 * @returns {Promise<string>}
 */
export async function generateQrSvgString(text, options = {}) {
  const {
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    margin = 2,
    errorCorrectionLevel = 'H',
  } = options;

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    errorCorrectionLevel,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });
}

/**
 * Generate QR code as Data URL (Base64) for preview
 * @param {string} text 
 * @param {object} options 
 * @returns {Promise<string>}
 */
export async function generateQrDataUrl(text, options = {}) {
  const {
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    width = 400,
    margin = 2,
    errorCorrectionLevel = 'H',
  } = options;

  return QRCode.toDataURL(text, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });
}
