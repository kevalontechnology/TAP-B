import fs from 'fs';
import { cloudinary } from '../config/cloudinary.js';

/**
 * Uploads a local file to Cloudinary with automatic optimization.
 * Cleans up the temporary local file on disk after a successful upload.
 *
 * @param {string} filePath - Absolute path to the local file
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload response object
 */
export async function uploadToCloudinary(filePath, options = {}) {
  if (!filePath) {
    throw new Error('No file path provided for Cloudinary upload');
  }

  const defaultOptions = {
    folder: 'tapzy_uploads',
    resource_type: 'auto', // handles images, PDFs, SVGs, etc.
  };

  const uploadOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Safely remove the local temporary file
    if (typeof filePath === 'string' && fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn('[Cloudinary] Could not remove temp file:', unlinkErr.message);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('[Cloudinary] Upload failed for', filePath, ':', error.message);
    throw error;
  }
}

/**
 * Generates an optimized Cloudinary delivery URL with auto-format and auto-quality.
 *
 * @param {string} publicId - The Cloudinary asset public ID
 * @param {Object} options - Transformation options (width, height, crop, etc.)
 * @returns {string} Optimized URL
 */
export function getOptimizedUrl(publicId, options = {}) {
  if (!publicId) return '';
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    secure: true,
    ...options,
  });
}

/**
 * Generates an auto-cropped square thumbnail URL.
 *
 * @param {string} publicId - The Cloudinary asset public ID
 * @param {number} size - Width and height in pixels (default 500)
 * @returns {string} Thumbnail URL
 */
export function getAutoCropUrl(publicId, size = 500) {
  if (!publicId) return '';
  return cloudinary.url(publicId, {
    crop: 'auto',
    gravity: 'auto',
    width: size,
    height: size,
    fetch_format: 'auto',
    quality: 'auto',
    secure: true,
  });
}

/**
 * Deletes an asset from Cloudinary by public ID.
 *
 * @param {string} publicId - Asset public ID
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>}
 */
export async function deleteFromCloudinary(publicId, options = {}) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, options);
  } catch (err) {
    console.warn('[Cloudinary] Deletion failed for', publicId, ':', err.message);
    return null;
  }
}

export default {
  uploadToCloudinary,
  getOptimizedUrl,
  getAutoCropUrl,
  deleteFromCloudinary,
};
