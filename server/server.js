// server/server.js — Muse Fitness Studio Backend & Admin Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB is initialized
require('./db');

// API Routes
const { router: authRouter } = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const statsRouter = require('./routes/stats');
const schedulesRouter = require('./routes/schedules');
const coachesRouter = require('./routes/coaches');
const branchesRouter = require('./routes/branches');
const pricingRouter = require('./routes/pricing');
const blogsRouter = require('./routes/blogs');
const settingsRouter = require('./routes/settings');
const uploadRouter = require('./routes/upload');

app.use('/api/auth', authRouter);
app.use('/api', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api', schedulesRouter);
app.use('/api', coachesRouter);
app.use('/api', branchesRouter);
app.use('/api', pricingRouter);
app.use('/api', blogsRouter);
app.use('/api', settingsRouter);
app.use('/api', uploadRouter);

// Serve Admin UI statically at /admin
const adminDir = path.join(__dirname, '..', 'admin');
app.use('/admin', express.static(adminDir));

// Dynamic frontend config from .env
app.get('/env-config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.__LIVE_SITE_ORIGIN__ = ${JSON.stringify(process.env.LIVE_SITE_ORIGIN || 'https://www.musefitnessstudio.com')};`);
});

// Serve Landing page files and assets
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Muse Fitness Studio CMS/CRM Backend',
    time: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🌸 Muse Fitness Studio System is running!`);
    console.log(`🌐 Website Landing Page: http://localhost:${PORT}`);
    console.log(`👑 Admin Dashboard:      http://localhost:${PORT}/admin`);
    console.log(`🔌 API Base Endpoint:   http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
}

module.exports = app;
