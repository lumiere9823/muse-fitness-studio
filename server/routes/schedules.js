// server/routes/schedules.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

// Public: Get all active schedules or filtered
router.get('/schedules', (req, res) => {
  try {
    const { branch, discipline, level, includeInactive } = req.query;

    let query = 'SELECT * FROM schedules WHERE 1=1';
    const params = [];

    if (!includeInactive) {
      query += ' AND is_active = 1';
    }

    if (branch && branch !== 'all') {
      query += ' AND branch = ?';
      params.push(branch);
    }

    if (discipline && discipline !== 'all') {
      query += ' AND discipline = ?';
      params.push(discipline);
    }

    if (level && level !== 'all') {
      query += ' AND level = ?';
      params.push(level);
    }

    query += ' ORDER BY order_index ASC, id ASC';

    const items = db.prepare(query).all(...params);
    return res.json({ ok: true, data: items });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải lịch tập' });
  }
});

// Protected: Create new schedule slot
router.post('/schedules', requireAuth, (req, res) => {
  try {
    const {
      branch,
      slot_period = 'morning',
      slot_time,
      class_title,
      discipline,
      level,
      level_label,
      desc = '',
      coach_name = '',
      order_index = 0,
      is_active = 1,
    } = req.body;

    if (!branch || !slot_time || !class_title) {
      return res.status(400).json({ ok: false, error: 'Vui lòng điền đủ chi nhánh, khung giờ và tên lớp' });
    }

    const stmt = db.prepare(`
      INSERT INTO schedules (
        branch, slot_period, slot_time, class_title, discipline, level, level_label, desc, coach_name, order_index, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      branch,
      slot_period,
      slot_time,
      class_title,
      discipline || class_title,
      level || 'lv1',
      level_label || (level === 'lv2' ? 'Level 2 — Nâng cao kỹ thuật' : 'Level 1 — Làm quen từ đầu'),
      desc,
      coach_name,
      Number(order_index) || 0,
      is_active ? 1 : 0
    );

    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo lịch tập mới' });
  }
});

// Protected: Update schedule slot
router.put('/schedules/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const {
      branch,
      slot_period,
      slot_time,
      class_title,
      discipline,
      level,
      level_label,
      desc,
      coach_name,
      order_index,
      is_active,
    } = req.body;

    const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Lớp học không tồn tại' });
    }

    const stmt = db.prepare(`
      UPDATE schedules SET
        branch = COALESCE(?, branch),
        slot_period = COALESCE(?, slot_period),
        slot_time = COALESCE(?, slot_time),
        class_title = COALESCE(?, class_title),
        discipline = COALESCE(?, discipline),
        level = COALESCE(?, level),
        level_label = COALESCE(?, level_label),
        desc = COALESCE(?, desc),
        coach_name = COALESCE(?, coach_name),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(
      branch,
      slot_period,
      slot_time,
      class_title,
      discipline,
      level,
      level_label,
      desc,
      coach_name,
      order_index !== undefined ? Number(order_index) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    return res.json({ ok: true, message: 'Đã cập nhật lịch tập' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật lịch tập' });
  }
});

// Protected: Delete schedule
router.delete('/schedules/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa lịch tập' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xóa lịch tập' });
  }
});

module.exports = router;
