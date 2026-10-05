// functions/api/[[route]].js — Cloudflare Pages Functions Edge API Router
import { createClient } from '@supabase/supabase-js';

// Helper: JSON response with CORS headers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function getSupabase(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Telegram alert helper
async function sendTelegramAlert(env, lead) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const origin = env.LIVE_SITE_ORIGIN || 'https://www.musefitnessstudio.com';
  const text = [
    `🔔 <b>KHÁCH HÀNG MỚI ĐĂNG KÝ TẬP THỬ!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Họ tên:</b> ${lead.name || 'Chưa có'}`,
    `📞 <b>Số điện thoại:</b> <code>${lead.phone || 'Chưa có'}</code>`,
    lead.email ? `✉️ <b>Email:</b> ${lead.email}` : null,
    `🏢 <b>Chi nhánh:</b> ${lead.branch || 'Chưa chọn'}`,
    `🎯 <b>Mục tiêu:</b> ${lead.goal || 'Tư vấn chung'}`,
    lead.slot ? `⏰ <b>Khung giờ:</b> ${lead.slot}` : null,
    lead.note ? `📝 <b>Ghi chú:</b> <i>${lead.note}</i>` : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌐 <b>Nguồn:</b> ${lead.utm_source || 'Trực tiếp website'}${lead.utm_campaign ? ` (${lead.utm_campaign})` : ''}`,
    `⏱️ <b>Thời gian:</b> ${time}`,
    `👉 <a href="${origin}/admin/">Vào trang Quản trị xử lý lead</a>`,
  ].filter(Boolean).join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('Telegram send error:', e);
  }
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathParts = params.route || [];
  const pathname = pathParts.join('/');
  const method = request.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const supabase = getSupabase(env);

  // 1. Health check
  if (pathname === 'health') {
    return jsonResponse({
      ok: true,
      service: 'Muse Fitness Studio on Cloudflare Pages Functions',
      time: new Date().toISOString(),
      supabaseConfigured: Boolean(supabase),
      cloudinaryConfigured: Boolean(env.CLOUDINARY_CLOUD_NAME),
    });
  }

  // 2. Auth: Login
  if (pathname === 'auth/login' && method === 'POST') {
    try {
      const body = await request.json();
      const { username, password } = body || {};
      if (username === 'admin' && (password === 'muse123456' || password === env.ADMIN_PASSWORD)) {
        return jsonResponse({
          ok: true,
          token: 'cloudflare_muse_session_token_' + Date.now(),
          user: { id: 1, username: 'admin', name: 'Quản Trị Viên Muse', role: 'admin' },
        });
      }
      return jsonResponse({ ok: false, error: 'Tài khoản hoặc mật khẩu không đúng' }, 401);
    } catch (e) {
      return jsonResponse({ ok: false, error: 'Lỗi đăng nhập' }, 400);
    }
  }

  // Auth: Me
  if (pathname === 'auth/me') {
    return jsonResponse({
      ok: true,
      user: { id: 1, username: 'admin', name: 'Quản Trị Viên Muse', role: 'admin' },
    });
  }

  // 3. Lead Submission (POST /api/lead or /api/leads/public)
  if ((pathname === 'lead' || pathname === 'leads/public') && method === 'POST') {
    try {
      const body = await request.json();
      if (!body.name || !body.phone) {
        return jsonResponse({ ok: false, error: 'Họ tên và số điện thoại là bắt buộc' }, 400);
      }

      if (supabase) {
        const { data, error } = await supabase.from('leads').insert({
          event_id: body.event_id || '',
          name: body.name.trim(),
          phone: body.phone.trim(),
          email: body.email ? body.email.trim() : null,
          branch: body.branch || '',
          goal: body.goal || '',
          slot: body.slot || '',
          note: body.note || '',
          source: body.source || 'website_form',
          utm_source: body.utm_source || '',
          utm_medium: body.utm_medium || '',
          utm_campaign: body.utm_campaign || '',
          utm_content: body.utm_content || '',
          utm_term: body.utm_term || '',
          fbclid: body.fbclid || '',
          ttclid: body.ttclid || '',
          gclid: body.gclid || '',
          page_url: body.page_url || '',
          referrer: body.referrer || '',
        }).select();

        if (error) console.error('Supabase lead error:', error);
      }

      // Send telegram alert in background
      sendTelegramAlert(env, body);

      return jsonResponse({
        ok: true,
        message: 'Muse đã nhận thông tin của nàng thành công.',
      });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 4. Leads CRM (GET /api/leads, PATCH /api/leads/:id, POST /api/leads, DELETE /api/leads/:id)
  if (pathname.startsWith('leads')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    // Export CSV
    if (pathname === 'leads/export/csv') {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      const rows = (data || []).map((l) => [
        l.id,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.branch || '').replace(/"/g, '""')}"`,
        `"${(l.goal || '').replace(/"/g, '""')}"`,
        `"${l.status || 'new'}"`,
        `"${l.created_at || ''}"`,
      ]);
      const csv = '\uFEFFID,Họ tên,Số điện thoại,Email,Chi nhánh,Mục tiêu,Trạng thái,Ngày tạo\r\n' + rows.map((r) => r.join(',')).join('\r\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="leads_muse.csv"',
        },
      });
    }

    if (method === 'GET' && pathname === 'leads') {
      const search = url.searchParams.get('search');
      const branch = url.searchParams.get('branch');
      const status = url.searchParams.get('status');

      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (branch && branch !== 'all') query = query.eq('branch', branch);
      if (status && status !== 'all') query = query.eq('status', status);
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'PATCH') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('leads').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('leads').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa lead' });
    }
  }

  // 5. Dashboard Stats (GET /api/stats/dashboard)
  if (pathname === 'stats/dashboard') {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const all = leads || [];
    const totalLeads = all.length;
    const convertedLeads = all.filter((l) => l.status === 'converted').length;
    const attendedLeads = all.filter((l) => l.status === 'attended' || l.status === 'converted').length;
    const leadsToday = all.filter((l) => {
      const d = new Date(l.created_at);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    const statusBreakdown = { new: 0, contacting: 0, scheduled: 0, attended: 0, converted: 0, cancelled: 0 };
    const branchCounts = {};
    const sourceCounts = {};

    all.forEach((l) => {
      if (statusBreakdown[l.status] !== undefined) statusBreakdown[l.status]++;
      const b = l.branch || 'Chưa chọn';
      branchCounts[b] = (branchCounts[b] || 0) + 1;
      const s = l.utm_source || 'Direct / Tự nhiên';
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    });

    const branchBreakdown = Object.entries(branchCounts).map(([branch, count]) => ({ branch, count }));
    const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));

    return jsonResponse({
      ok: true,
      stats: {
        totalLeads,
        leadsToday,
        leadsWeek: totalLeads,
        convertedLeads,
        attendedLeads,
        conversionRate,
        statusBreakdown,
        branchBreakdown,
        sourceBreakdown,
        recentLeads: all.slice(0, 5),
      },
    });
  }

  // 6. Schedules (GET /api/schedules, POST, PUT, DELETE)
  if (pathname.startsWith('schedules')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      let query = supabase.from('schedules').select('*').order('order_index', { ascending: true });
      const branch = url.searchParams.get('branch');
      const discipline = url.searchParams.get('discipline');
      if (branch && branch !== 'all') query = query.eq('branch', branch);
      if (discipline && discipline !== 'all') query = query.eq('discipline', discipline);
      const { data, error } = await query;
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('schedules').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'PUT') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('schedules').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa' });
    }
  }

  // 7. Coaches (GET /api/coaches, POST, PUT, DELETE)
  if (pathname.startsWith('coaches')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('coaches').select('*').order('order_index', { ascending: true });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('coaches').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'PUT') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('coaches').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('coaches').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa' });
    }
  }

  // 8. Branches (GET /api/branches, POST, PUT, DELETE)
  if (pathname.startsWith('branches')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('branches').select('*').order('order_index', { ascending: true });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('branches').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'PUT') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('branches').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa' });
    }
  }

  // 9. Pricing (GET /api/pricing, POST, PUT, DELETE)
  if (pathname.startsWith('pricing')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('pricing_plans').select('*').order('order_index', { ascending: true });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }
  }

  // 10. Blogs (GET /api/blogs)
  if (pathname.startsWith('blogs')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }
  }

  // 11. Settings & Status
  if (pathname === 'settings') {
    return jsonResponse({
      ok: true,
      data: {
        studio_name: 'Muse Fitness Studio',
        hotline: '1900 299 991',
        email: 'contact@musefitnessstudio.com',
        working_hours: '6:00 – 21:00 (Thứ 2 – Chủ Nhật)',
        telegram_bot_token_masked: env.TELEGRAM_BOT_TOKEN ? '****' : '',
        enable_telegram_notifications: env.TELEGRAM_BOT_TOKEN ? '1' : '0',
      },
      cloudStatus: {
        cloudinary: { configured: Boolean(env.CLOUDINARY_CLOUD_NAME), cloudName: env.CLOUDINARY_CLOUD_NAME || '' },
        supabase: { configured: Boolean(supabase), url: env.SUPABASE_URL || '' },
      },
    });
  }

  // Test Telegram endpoint
  if (pathname === 'settings/test-telegram' && method === 'POST') {
    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return jsonResponse({ ok: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID trong biến môi trường Cloudflare.' }, 400);
    }
    const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🤖 <b>MUSE FITNESS STUDIO — CLOUDFLARE PAGES EDGE BOT</b>\n\n✅ Kết nối thành công trên Cloudflare!\n⏱️ ${time}`,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    return jsonResponse({ ok: data.ok, message: data.ok ? 'Đã gửi tin nhắn thử nghiệm thành công!' : data.description });
  }

  return jsonResponse({ ok: false, error: 'Not found: /api/' + pathname }, 404);
}
