// server/routes/branches.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

// Public: Get all active branches
router.get('/branches', (req, res) => {
  try {
    const { includeInactive } = req.query;
    let query = 'SELECT * FROM branches';
    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY order_index ASC, id ASC';

    const branches = db.prepare(query).all();
    return res.json({ ok: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải danh sách chi nhánh' });
  }
});

// Protected: Create branch
router.post('/branches', requireAuth, (req, res) => {
  try {
    const { name, slug, address, phone = '1900 299 991', opening_hours = '6:00 – 21:00 (T2 – CN)', map_url = '', image_url = '', order_index = 0, is_active = 1 } = req.body;
    if (!name || !address) {
      return res.status(400).json({ ok: false, error: 'Tên và địa chỉ chi nhánh là bắt buộc' });
    }

    const branchSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const stmt = db.prepare(`
      INSERT INTO branches (name, slug, address, phone, opening_hours, map_url, image_url, order_index, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, branchSlug, address, phone, opening_hours, map_url, image_url, Number(order_index) || 0, is_active ? 1 : 0);
    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating branch:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo chi nhánh mới' });
  }
});

// Protected: Update branch
router.put('/branches/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, address, phone, opening_hours, map_url, image_url, order_index, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Chi nhánh không tồn tại' });
    }

    const stmt = db.prepare(`
      UPDATE branches SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        opening_hours = COALESCE(?, opening_hours),
        map_url = COALESCE(?, map_url),
        image_url = COALESCE(?, image_url),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(name, slug, address, phone, opening_hours, map_url, image_url, order_index !== undefined ? Number(order_index) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);
    return res.json({ ok: true, message: 'Đã cập nhật chi nhánh' });
  } catch (error) {
    console.error('Error updating branch:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật chi nhánh' });
  }
});

// Protected: Delete branch
router.delete('/branches/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM branches WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa chi nhánh' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xóa chi nhánh' });
  }
});

module.exports = router;
