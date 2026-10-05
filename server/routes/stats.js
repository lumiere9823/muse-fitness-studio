// server/routes/stats.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('./auth');

router.get('/dashboard', requireAuth, (req, res) => {
  try {
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

    const leadsToday = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE date(created_at, '+7 hours') = date('now', '+7 hours')
    `).get().count;

    const leadsWeek = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    const convertedLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads WHERE status = 'converted'
    `).get().count;

    const attendedLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads WHERE status IN ('attended', 'converted')
    `).get().count;

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Status breakdown
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as count FROM leads GROUP BY status
    `).all();

    const statusMap = {
      new: 0,
      contacting: 0,
      scheduled: 0,
      attended: 0,
      converted: 0,
      cancelled: 0,
    };
    statusRows.forEach((r) => {
      statusMap[r.status] = r.count;
    });

    // Branch breakdown
    const branchRows = db.prepare(`
      SELECT COALESCE(NULLIF(branch, ''), 'Chưa xác định') as branch, COUNT(*) as count 
      FROM leads GROUP BY branch ORDER BY count DESC
    `).all();

    // UTM source breakdown
    const sourceRows = db.prepare(`
      SELECT COALESCE(NULLIF(utm_source, ''), 'Direct / Tự nhiên') as source, COUNT(*) as count 
      FROM leads GROUP BY utm_source ORDER BY count DESC LIMIT 5
    `).all();

    // Recent 5 leads
    const recentLeads = db.prepare(`
      SELECT id, name, phone, branch, goal, status, created_at 
      FROM leads ORDER BY created_at DESC LIMIT 5
    `).all();

    // Daily leads for the last 7 days chart
    const dailyRows = db.prepare(`
      SELECT date(created_at, '+7 hours') as day, COUNT(*) as count
      FROM leads
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY day
      ORDER BY day ASC
    `).all();

    return res.json({
      ok: true,
      stats: {
        totalLeads,
        leadsToday,
        leadsWeek,
        convertedLeads,
        attendedLeads,
        conversionRate,
        statusBreakdown: statusMap,
        branchBreakdown: branchRows,
        sourceBreakdown: sourceRows,
        recentLeads,
        dailyLeads: dailyRows,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ ok: false, error: 'Lỗi nạp thống kê dashboard' });
  }
});

module.exports = router;
