// server/routes/settings.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');
const { sendTelegramMessage } = require('../services/telegram');
const { isCloudinaryConfigured, testCloudinaryConnection } = require('../services/cloudinary');
const { isSupabaseConfigured, testSupabaseConnection } = require('../supabase');
const { syncToSupabase } = require('../sync-to-supabase');

router.get('/settings', requireAuth, (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });

    // Mask bot token for security
    if (settings.telegram_bot_token) {
      const len = settings.telegram_bot_token.length;
      if (len > 8) {
        settings.telegram_bot_token_masked = settings.telegram_bot_token.slice(0, 4) + '...' + settings.telegram_bot_token.slice(-4);
      }
    }

    // Include Cloud Provider statuses
    const cloudStatus = {
      cloudinary: {
        configured: isCloudinaryConfigured(),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      },
      supabase: {
        configured: isSupabaseConfigured(),
        url: process.env.SUPABASE_URL || '',
      },
    };

    return res.json({ ok: true, data: settings, cloudStatus });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải cài đặt' });
  }
});

router.post('/settings', requireAuth, (req, res) => {
  try {
    const updates = req.body || {};
    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'telegram_bot_token_masked') {
        upsertStmt.run(key, String(value ?? ''));
      }
    }

    return res.json({ ok: true, message: 'Đã lưu cấu hình thành công' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi lưu cài đặt' });
  }
});

router.post('/settings/test-telegram', requireAuth, async (req, res) => {
  try {
    const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const testMessage = `🤖 <b>MUSE FITNESS STUDIO — KIỂM TRA KẾT NỐI TELEGRAM BOT</b>\n\n✅ Kết nối thành công!\nHệ thống thông báo Lead đã sẵn sàng nhận cảnh báo tức thì khi có khách đăng ký tập thử trên website.\n\n⏱️ Thời gian: ${time}`;
    
    const result = await sendTelegramMessage(testMessage);
    if (result.success) {
      return res.json({ ok: true, message: 'Đã gửi tin nhắn thử nghiệm tới Telegram thành công!' });
    } else {
      return res.status(400).json({
        ok: false,
        error: result.error || result.reason || 'Không thể gửi tin nhắn qua Telegram. Vui lòng kiểm tra lại Bot Token và Chat ID.',
      });
    }
  } catch (error) {
    console.error('Error testing telegram:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/settings/test-cloudinary', requireAuth, async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const result = await testCloudinaryConnection();
    if (result.ok) {
      return res.json({ ok: true, message: 'Kết nối Cloudinary thành công!' });
    } else {
      return res.status(400).json({ ok: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/settings/test-supabase', requireAuth, async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const result = await testSupabaseConnection();
    if (result.ok) {
      return res.json({ ok: true, message: 'Kết nối Supabase PostgreSQL thành công!' });
    } else {
      return res.status(400).json({ ok: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/settings/sync-supabase', requireAuth, async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const result = await syncToSupabase();
    if (result.ok) {
      return res.json({
        ok: true,
        message: 'Đã đồng bộ toàn bộ dữ liệu mẫu lên Supabase thành công!',
        summary: result.summary,
      });
    } else {
      return res.status(400).json({ ok: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
