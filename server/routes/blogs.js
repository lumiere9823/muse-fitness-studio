// server/routes/blogs.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

// Public: Get blogs
router.get('/blogs', (req, res) => {
  try {
    const { category, includeUnpublished } = req.query;
    let query = 'SELECT id, title, slug, category, summary, cover_image, read_time, is_published, created_at FROM blogs WHERE 1=1';
    const params = [];

    if (!includeUnpublished) {
      query += ' AND is_published = 1';
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';
    const blogs = db.prepare(query).all(...params);
    return res.json({ ok: true, data: blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải danh sách bài viết' });
  }
});

// Public: Get blog by ID or slug
router.get('/blogs/:idOrSlug', (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isId = /^\d+$/.test(idOrSlug);
    const query = isId
      ? 'SELECT * FROM blogs WHERE id = ?'
      : 'SELECT * FROM blogs WHERE slug = ?';
    const blog = db.prepare(query).get(idOrSlug);

    if (!blog) {
      return res.status(404).json({ ok: false, error: 'Bài viết không tồn tại' });
    }
    return res.json({ ok: true, data: blog });
  } catch (error) {
    console.error('Error fetching blog detail:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tải chi tiết bài viết' });
  }
});

// Protected: Create blog
router.post('/blogs', requireAuth, (req, res) => {
  try {
    const { title, slug, category = 'Luyện tập', summary = '', content = '', cover_image = 'assets/blog-weight-training.jpg', read_time = '5 phút', is_published = 1 } = req.body;
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Tiêu đề bài viết là bắt buộc' });
    }

    const blogSlug = slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stmt = db.prepare(`
      INSERT INTO blogs (title, slug, category, summary, content, cover_image, read_time, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(title.trim(), blogSlug, category, summary, content, cover_image, read_time, is_published ? 1 : 0);
    return res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi tạo bài viết mới' });
  }
});

// Protected: Update blog
router.put('/blogs/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, category, summary, content, cover_image, read_time, is_published } = req.body;

    const existing = db.prepare('SELECT * FROM blogs WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Bài viết không tồn tại' });
    }

    const stmt = db.prepare(`
      UPDATE blogs SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        category = COALESCE(?, category),
        summary = COALESCE(?, summary),
        content = COALESCE(?, content),
        cover_image = COALESCE(?, cover_image),
        read_time = COALESCE(?, read_time),
        is_published = COALESCE(?, is_published),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(title, slug, category, summary, content, cover_image, read_time, is_published !== undefined ? (is_published ? 1 : 0) : null, id);
    return res.json({ ok: true, message: 'Đã cập nhật bài viết' });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi cập nhật bài viết' });
  }
});

// Protected: Delete blog
router.delete('/blogs/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM blogs WHERE id = ?').run(id);
    return res.json({ ok: true, message: 'Đã xóa bài viết' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi xóa bài viết' });
  }
});

module.exports = router;
