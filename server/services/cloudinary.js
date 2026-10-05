// server/services/cloudinary.js — Cloudinary media upload and optimization service
const cloudinary = require('cloudinary').v2;

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function initCloudinary() {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
  }
}

initCloudinary();

/**
 * Upload an image file to Cloudinary with automatic WebP conversion and optimization
 * @param {string} filePath - Absolute path to local file
 * @param {object} options - Custom upload options
 */
async function uploadImage(filePath, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary chưa được cấu hình (thiếu CLOUDINARY_CLOUD_NAME, API_KEY hoặc API_SECRET)');
  }

  initCloudinary();

  const defaultOptions = {
    folder: 'muse-fitness-studio',
    format: 'webp', // Auto convert to webp for ultra-fast loading
    quality: 'auto:good', // Smart compression
    fetch_format: 'auto',
    resource_type: 'image',
    ...options,
  };

  const result = await cloudinary.uploader.upload(filePath, defaultOptions);
  return {
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Test Cloudinary connection
 */
async function testCloudinaryConnection() {
  if (!isCloudinaryConfigured()) {
    return { ok: false, error: 'Chưa điền đủ thông số Cloudinary trong .env' };
  }
  try {
    initCloudinary();
    const ping = await cloudinary.api.ping();
    return { ok: true, message: 'Kết nối Cloudinary thành công!', ping };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImage,
  testCloudinaryConnection,
};
