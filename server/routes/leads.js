// server/routes/leads.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');
const { notifyNewLead } = require('../services/telegram');

// Public endpoint for lead capture from landing page
function handleLeadSubmit(req, res) {
  try {
    const {
      name,
      phone,
      email = '',
      branch = '',
      goal = '',
      slot = '',
      note = '',
      event_id = '',
      utm_source = '',
      utm_medium = '',
      utm_campaign = '',
      utm_content = '',
      utm_term = '',
      fbclid = '',
      ttclid = '',
      gclid = '',
      page_url = '',
      referrer = '',
      source = 'website_form',
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: 'Họ tên và số điện thoại là bắt buộc' });
    }

    const stmt = db.prepare(`
      INSERT INTO leads (
        event_id, name, phone, email, branch, goal, slot, note,
        source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, ttclid, gclid, page_url, referrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event_id,
      name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      branch.trim(),
      goal.trim(),
      slot.trim(),
      note.trim(),
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      ttclid,
      gclid,
      page_url,
      referrer
    );

    const leadId = result.lastInsertRowid;
    const leadData = {
      id: leadId,
      name,
      phone,
      email,
      branch,
      goal,
      slot,
      note,
      utm_source,
      utm_campaign,
    };

    // Trigger Telegram notification in background (non-blocking)
    notifyNewLead(leadData).catch((err) => console.error('Telegram notification error:', err));

    return res.json({
      ok: true,
      id: leadId,
      message: 'Muse đã nhận thông tin thành công.',
    });
  } catch (error) {
    console.error('Error inserting lead:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi máy chủ khi lưu thông tin.' });
  }
}

// Support both POST /api/lead and POST /api/leads for website submissions
router.post('/lead', handleLeadSubmit);
router.post('/leads/public', handleLeadSubmit);

// Protected: Get leads list with filtering and search
router.get('/leads', requireAuth, (req, res) => {
  try {
    const { branch, status, search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (branch && branch !== 'all') {
      query += ' AND branch = ?';
      params.push(branch);
    }

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const leads = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM leads WHERE 1=1';
    const countParams = [];
    if (branch && branch !== 'all') {
      countQuery += ' AND branch = ?';
      countParams.push(branch);
    }
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (search && search.trim()) {
      countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const keyword = `%${search.trim()}%`;
      countParams.push(keyword, keyword, keyword);
    }
    const total = db.prepare(countQuery).get(...countParams).count;

    return res.json({ ok: true, data: leads, total });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải danh sách lead' });
  }
});

// Protected: Manual lead creation (by receptionist/phone)
router.post('/leads', requireAuth, (req, res) => {
  try {
    const { name, phone, email, branch, goal, slot, note, counselor_notes, status = 'new' } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: 'Họ tên và số điện thoại là bắt buộc' });
    }

    const stmt = db.prepare(`
      INSERT INTO leads (name, phone, email, branch, goal, slot, note, counselor_notes, status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_entry')
    `);

    const result = stmt.run(
      name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      branch || '',
      goal || '',
      slot || '',
      note || '',
      counselor_notes || '',
      status
    );

    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating manual lead:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo lead mới' });
  }
});

// Protected: Update lead status or counselor notes
router.patch('/leads/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status, counselor_notes, branch, goal, slot } = req.body;

    const currentLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!currentLead) {
      return res.status(404).json({ ok: false, error: 'Lead không tồn tại' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (counselor_notes !== undefined) {
      updates.push('counselor_notes = ?');
      params.push(counselor_notes);
    }
    if (branch !== undefined) {
      updates.push('branch = ?');
      params.push(branch);
    }
    if (goal !== undefined) {
      updates.push('goal = ?');
      params.push(goal);
    }
    if (slot !== undefined) {
      updates.push('slot = ?');
      params.push(slot);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    return res.json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật lead' });
  }
});

// Protected: Delete lead
router.delete('/leads/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa lead' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi khi xóa lead' });
  }
});

// Protected: Export leads to CSV
router.get('/leads/export/csv', requireAuth, (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();

    const headers = [
      'ID',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'Chi nhánh',
      'Mục tiêu',
      'Khung giờ',
      'Trạng thái',
      'Ghi chú khách',
      'Ghi chú tư vấn',
      'Nguồn UTM',
      'Chiến dịch',
      'Ngày đăng ký',
    ];

    const statusMap = {
      new: 'Mới tiếp nhận',
      contacting: 'Đang liên hệ',
      scheduled: 'Đã hẹn tập thử',
      attended: 'Đã đến tập',
      converted: 'Đã chốt gói',
      cancelled: 'Huỷ / Không nghe máy',
    };

    const rows = leads.map((l) => [
      l.id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.branch || '').replace(/"/g, '""')}"`,
      `"${(l.goal || '').replace(/"/g, '""')}"`,
      `"${(l.slot || '').replace(/"/g, '""')}"`,
      `"${statusMap[l.status] || l.status}"`,
      `"${(l.note || '').replace(/"/g, '""')}"`,
      `"${(l.counselor_notes || '').replace(/"/g, '""')}"`,
      `"${(l.utm_source || '').replace(/"/g, '""')}"`,
      `"${(l.utm_campaign || '').replace(/"/g, '""')}"`,
      `"${l.created_at}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_muse_fitness.csv"');
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting leads:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xuất file CSV' });
  }
});

module.exports = router;
