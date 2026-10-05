// server/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('./auth');
const { isCloudinaryConfigured, uploadImage, testCloudinaryConnection } = require('../services/cloudinary');

const uploadDir = path.join(__dirname, '..', '..', 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'muse-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh (.jpg, .png, .webp, .svg)'));
    }
  },
});

router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Chưa có file nào được chọn' });
    }

    const localFilePath = req.file.path;

    // If Cloudinary is configured, upload to Cloudinary CDN
    if (isCloudinaryConfigured()) {
      try {
        const cldResult = await uploadImage(localFilePath);
        // Optionally clean up local temp file after cloud upload
        fs.unlink(localFilePath, () => {});

        return res.json({
          ok: true,
          provider: 'cloudinary',
          url: cldResult.url,
          format: cldResult.format,
          size: cldResult.bytes,
        });
      } catch (cldErr) {
        console.error('Cloudinary upload error, fallback to local:', cldErr.message);
      }
    }

    // Fallback: local storage
    const relativeUrl = `assets/uploads/${req.file.filename}`;
    return res.json({
      ok: true,
      provider: 'local',
      url: relativeUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Lỗi tải ảnh' });
  }
});

// Check Cloudinary status
router.get('/upload/status', requireAuth, (req, res) => {
  res.json({
    ok: true,
    cloudinaryConfigured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  });
});

// Test Cloudinary connection
router.post('/upload/test-cloudinary', requireAuth, async (req, res) => {
  const result = await testCloudinaryConnection();
  if (result.ok) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

module.exports = router;
