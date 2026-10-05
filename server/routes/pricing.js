// server/routes/pricing.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

// Public: Get all pricing plans
router.get('/pricing', (req, res) => {
  try {
    const { category, includeInactive } = req.query;
    let query = 'SELECT * FROM pricing_plans WHERE 1=1';
    const params = [];

    if (!includeInactive) {
      query += ' AND is_active = 1';
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY order_index ASC, id ASC';

    const items = db.prepare(query).all(...params);
    const formatted = items.map((p) => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
    }));

    return res.json({ ok: true, data: formatted });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải danh sách gói tập' });
  }
});

// Protected: Create pricing plan
router.post('/pricing', requireAuth, (req, res) => {
  try {
    const {
      category = 'membership',
      name,
      badge = '',
      price_display,
      unit = '/ tháng',
      features = [],
      is_featured = 0,
      button_text = 'Đăng ký tư vấn',
      order_index = 0,
      is_active = 1,
    } = req.body;

    if (!name || !price_display) {
      return res.status(400).json({ ok: false, error: 'Tên gói và giá hiển thị là bắt buộc' });
    }

    const stmt = db.prepare(`
      INSERT INTO pricing_plans (
        category, name, badge, price_display, unit, features, is_featured, button_text, order_index, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      category,
      name.trim(),
      badge.trim(),
      price_display.trim(),
      unit.trim(),
      JSON.stringify(Array.isArray(features) ? features : [features]),
      is_featured ? 1 : 0,
      button_text.trim(),
      Number(order_index) || 0,
      is_active ? 1 : 0
    );

    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating pricing plan:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo gói tập mới' });
  }
});

// Protected: Update pricing plan
router.put('/pricing/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, badge, price_display, unit, features, is_featured, button_text, order_index, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM pricing_plans WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Gói tập không tồn tại' });
    }

    const stmt = db.prepare(`
      UPDATE pricing_plans SET
        category = COALESCE(?, category),
        name = COALESCE(?, name),
        badge = COALESCE(?, badge),
        price_display = COALESCE(?, price_display),
        unit = COALESCE(?, unit),
        features = COALESCE(?, features),
        is_featured = COALESCE(?, is_featured),
        button_text = COALESCE(?, button_text),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(
      category,
      name,
      badge,
      price_display,
      unit,
      features ? JSON.stringify(Array.isArray(features) ? features : [features]) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      button_text,
      order_index !== undefined ? Number(order_index) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    return res.json({ ok: true, message: 'Đã cập nhật gói tập' });
  } catch (error) {
    console.error('Error updating pricing plan:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật gói tập' });
  }
});

// Protected: Delete pricing plan
router.delete('/pricing/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM pricing_plans WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa gói tập' });
  } catch (error) {
    console.error('Error deleting pricing plan:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xóa gói tập' });
  }
});

module.exports = router;
