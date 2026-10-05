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

async function sha1(str) {
  const buffer = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
      service: 'Muse Fitness Studio on Cloudflare Edge',
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

  // 3. Cloudinary Signature for Direct Browser Upload
  if (pathname === 'cloudinary/sign' && method === 'POST') {
    const apiSecret = env.CLOUDINARY_API_SECRET;
    const apiKey = env.CLOUDINARY_API_KEY;
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    if (!apiSecret || !apiKey || !cloudName) {
      return jsonResponse({ ok: false, error: 'Chưa cấu hình Cloudinary Secret trên Cloudflare' }, 500);
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'muse-fitness-studio';
    // Cloudinary signature format: sorted params joined by & then appended with secret
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(toSign);

    return jsonResponse({
      ok: true,
      signature,
      timestamp,
      folder,
      apiKey,
      cloudName,
    });
  }

  // 4. Public Combined Content Endpoint (powers dynamic landing pages)
  if (pathname === 'content/public' && method === 'GET') {
    if (!supabase) {
      return jsonResponse({ ok: true, data: {}, fallback: true });
    }

    try {
      const [settingsRes, branchesRes, coachesRes, pricingRes, schedulesRes, blogsRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('branches').select('*').eq('is_active', 1).order('order_index', { ascending: true }),
        supabase.from('coaches').select('*').eq('is_active', 1).order('order_index', { ascending: true }),
        supabase.from('pricing_plans').select('*').eq('is_active', 1).order('order_index', { ascending: true }),
        supabase.from('schedules').select('*').eq('is_active', 1).order('order_index', { ascending: true }),
        supabase.from('blogs').select('*').eq('is_published', 1).order('created_at', { ascending: false }).limit(6),
      ]);

      const settingsMap = {};
      (settingsRes.data || []).forEach((row) => {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch (_) {
          settingsMap[row.key] = row.value;
        }
      });

      return jsonResponse({
        ok: true,
        data: {
          settings: settingsMap,
          branches: branchesRes.data || [],
          coaches: coachesRes.data || [],
          pricing: pricingRes.data || [],
          schedules: schedulesRes.data || [],
          blogs: blogsRes.data || [],
        },
      });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 5. Lead Submission (POST /api/lead or /api/leads/public)
  if ((pathname === 'lead' || pathname === 'leads/public') && method === 'POST') {
    try {
      const body = await request.json();

      // Anti-Spam Bot Protection: Honeypot trap check
      if (body.website || body.hp_website || body.honeypot || body.website_trap) {
        return jsonResponse({ ok: true, message: 'Đã nhận thông tin' });
      }

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
          fbp: body.fbp || '',
          fbc: body.fbc || '',
          ttp: body.ttp || '',
          user_agent: request.headers.get('user-agent') || '',
          ip_address: request.headers.get('cf-connecting-ip') || '',
        }).select();

        if (error) {
          console.error('Supabase lead insert error:', error);
        }
      }

      // Trigger Telegram Alert
      await sendTelegramAlert(env, body);

      return jsonResponse({
        ok: true,
        message: 'Đăng ký thành công! Muse sẽ liên hệ sớm nhất.',
      });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 6. Leads Management (GET, PATCH, DELETE, Export)
  if (pathname.startsWith('leads')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET' && pathname === 'leads/export/csv') {
      const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      const rows = (leads || []).map((l) => [
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

  // 7. Dashboard Stats (GET /api/stats/dashboard)
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
      const s = l.source || 'website';
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    });

    return jsonResponse({
      ok: true,
      data: {
        totalLeads,
        leadsToday,
        attendedLeads,
        convertedLeads,
        conversionRate,
        statusBreakdown,
        branchCounts,
        sourceCounts,
      },
    });
  }

  // 8. Schedules (GET, POST, PUT, DELETE)
  if (pathname.startsWith('schedules')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const branch = url.searchParams.get('branch');
      const discipline = url.searchParams.get('discipline');
      const includeInactive = url.searchParams.get('includeInactive');

      let query = supabase.from('schedules').select('*').order('order_index', { ascending: true });
      if (branch && branch !== 'all') query = query.eq('branch', branch);
      if (discipline && discipline !== 'all') query = query.eq('discipline', discipline);
      if (!includeInactive) query = query.eq('is_active', 1);

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

  // 9. Coaches (GET, POST, PUT, DELETE)
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

  // 10. Branches (GET, POST, PUT, DELETE)
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

  // 11. Pricing Plans (GET, POST, PUT, DELETE)
  if (pathname.startsWith('pricing')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('pricing_plans').select('*').order('order_index', { ascending: true });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('pricing_plans').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'PUT') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('pricing_plans').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('pricing_plans').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa gói tập' });
    }
  }

  // 12. Blogs (GET, POST, PUT, DELETE)
  if (pathname.startsWith('blogs')) {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data: data || [] });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await supabase.from('blogs').insert(body).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'PUT') {
      const id = pathParts[1];
      const body = await request.json();
      const { data, error } = await supabase.from('blogs').update(body).eq('id', id).select();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, data });
    }

    if (method === 'DELETE') {
      const id = pathParts[1];
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã xóa bài viết' });
    }
  }

  // 13. Settings (GET, POST)
  if (pathname === 'settings') {
    if (!supabase) return jsonResponse({ ok: false, error: 'Chưa cấu hình Supabase' }, 500);

    if (method === 'GET') {
      const { data: rows, error } = await supabase.from('settings').select('*');
      const settingsMap = {
        studio_name: 'Muse Fitness Studio',
        hotline: '1900 299 991',
        email: 'contact@musefitnessstudio.com',
        working_hours: '6:00 – 21:00 (Thứ 2 – Chủ Nhật)',
        zalo_url: 'https://zalo.me/musefitnessstudio',
        facebook_url: 'https://facebook.com/musefitnessstudio',
        instagram_url: 'https://instagram.com/musefitnessstudio',
        tiktok_url: 'https://tiktok.com/@musefitnessstudio',
      };

      (rows || []).forEach((r) => {
        try {
          settingsMap[r.key] = JSON.parse(r.value);
        } catch (_) {
          settingsMap[r.key] = r.value;
        }
      });

      return jsonResponse({
        ok: true,
        data: settingsMap,
        cloudStatus: {
          cloudinary: { configured: Boolean(env.CLOUDINARY_CLOUD_NAME), cloudName: env.CLOUDINARY_CLOUD_NAME || '' },
          supabase: { configured: Boolean(supabase), url: env.SUPABASE_URL || '' },
          telegram: { configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) },
        },
      });
    }

    if (method === 'POST') {
      const body = await request.json();
      const upsertRows = Object.entries(body).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val),
      }));

      const { error } = await supabase.from('settings').upsert(upsertRows, { onConflict: 'key' });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true, message: 'Đã cập nhật cài đặt thành công' });
    }
  }

  // 14. Test Telegram endpoint
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
        text: `🤖 <b>MUSE FITNESS STUDIO — CLOUDFLARE EDGE BOT</b>\n\n✅ Kết nối thành công trên Cloudflare!\n⏱️ ${time}`,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    return jsonResponse({ ok: data.ok, message: data.ok ? 'Đã gửi tin nhắn thử nghiệm thành công!' : data.description });
  }

  return jsonResponse({ ok: false, error: 'Not found: /api/' + pathname }, 404);
}
