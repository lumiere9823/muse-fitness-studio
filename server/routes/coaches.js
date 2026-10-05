// server/routes/coaches.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

// Public: Get all coaches
router.get('/coaches', (req, res) => {
  try {
    const { includeInactive } = req.query;
    let query = 'SELECT * FROM coaches';
    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY order_index ASC, id ASC';

    const coaches = db.prepare(query).all();
    const formatted = coaches.map((c) => ({
      ...c,
      specialities: c.specialities ? JSON.parse(c.specialities) : [],
    }));

    return res.json({ ok: true, data: formatted });
  } catch (error) {
    console.error('Error fetching coaches:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải danh sách HLV' });
  }
});

// Protected: Create coach
router.post('/coaches', requireAuth, (req, res) => {
  try {
    const { name, title, tag = '', bio = '', photo_url = 'assets/photo-coach.jpg', specialities = [], order_index = 0, is_active = 1 } = req.body;
    if (!name || !title) {
      return res.status(400).json({ ok: false, error: 'Tên và chức danh HLV là bắt buộc' });
    }

    const stmt = db.prepare(`
      INSERT INTO coaches (name, title, tag, bio, photo_url, specialities, order_index, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      title.trim(),
      tag.trim(),
      bio.trim(),
      photo_url.trim(),
      JSON.stringify(Array.isArray(specialities) ? specialities : [specialities]),
      Number(order_index) || 0,
      is_active ? 1 : 0
    );

    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating coach:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo HLV mới' });
  }
});

// Protected: Update coach
router.put('/coaches/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, tag, bio, photo_url, specialities, order_index, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM coaches WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'HLV không tồn tại' });
    }

    const stmt = db.prepare(`
      UPDATE coaches SET
        name = COALESCE(?, name),
        title = COALESCE(?, title),
        tag = COALESCE(?, tag),
        bio = COALESCE(?, bio),
        photo_url = COALESCE(?, photo_url),
        specialities = COALESCE(?, specialities),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(
      name,
      title,
      tag,
      bio,
      photo_url,
      specialities ? JSON.stringify(Array.isArray(specialities) ? specialities : [specialities]) : null,
      order_index !== undefined ? Number(order_index) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    return res.json({ ok: true, message: 'Đã cập nhật HLV' });
  } catch (error) {
    console.error('Error updating coach:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật HLV' });
  }
});

// Protected: Delete coach
router.delete('/coaches/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM coaches WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa HLV' });
  } catch (error) {
    console.error('Error deleting coach:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xóa HLV' });
  }
});

module.exports = router;
