// server/sync-to-supabase.js — One-click sync from local DB to Supabase PostgreSQL
require('dotenv').config();
const { db } = require('./db');
const { isSupabaseConfigured, getSupabase } = require('./supabase');

async function syncToSupabase() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase chưa được cấu hình. Vui lòng điền SUPABASE_URL và KEY vào file .env');
    return { ok: false, error: 'Chưa cấu hình Supabase' };
  }

  const supabase = getSupabase();
  const summary = {};

  try {
    console.log('🔄 Đang đồng bộ dữ liệu từ Muse Studio lên Supabase...');

    // 1. Branches
    const branches = db.prepare('SELECT name, slug, address, phone, opening_hours, map_url, image_url, order_index, is_active FROM branches').all();
    if (branches.length) {
      const { data, error } = await supabase.from('branches').upsert(
        branches.map(b => ({ ...b, is_active: Boolean(b.is_active) })),
        { onConflict: 'slug' }
      );
      if (error) console.error('Lỗi sync branches:', error.message);
      else summary.branches = branches.length;
    }

    // 2. Coaches
    const coaches = db.prepare('SELECT name, title, tag, bio, photo_url, specialities, order_index, is_active FROM coaches').all();
    if (coaches.length) {
      const formattedCoaches = coaches.map(c => ({
        ...c,
        specialities: c.specialities ? JSON.parse(c.specialities) : [],
        is_active: Boolean(c.is_active)
      }));
      const { data, error } = await supabase.from('coaches').upsert(formattedCoaches);
      if (error) console.error('Lỗi sync coaches:', error.message);
      else summary.coaches = coaches.length;
    }

    // 3. Schedules
    const schedules = db.prepare('SELECT branch, slot_period, slot_time, class_title, discipline, level, level_label, desc, coach_name, order_index, is_active FROM schedules').all();
    if (schedules.length) {
      const formattedSchedules = schedules.map(s => ({
        ...s,
        is_active: Boolean(s.is_active)
      }));
      const { data, error } = await supabase.from('schedules').insert(formattedSchedules);
      if (error) console.error('Lỗi sync schedules:', error.message);
      else summary.schedules = schedules.length;
    }

    // 4. Pricing
    const pricing = db.prepare('SELECT category, name, badge, price_display, unit, features, is_featured, button_text, order_index, is_active FROM pricing_plans').all();
    if (pricing.length) {
      const formattedPricing = pricing.map(p => ({
        ...p,
        features: p.features ? JSON.parse(p.features) : [],
        is_featured: Boolean(p.is_featured),
        is_active: Boolean(p.is_active)
      }));
      const { data, error } = await supabase.from('pricing_plans').upsert(formattedPricing);
      if (error) console.error('Lỗi sync pricing:', error.message);
      else summary.pricing_plans = pricing.length;
    }

    // 5. Leads
    const leads = db.prepare('SELECT name, phone, email, branch, goal, slot, note, counselor_notes, status, source, utm_source, utm_campaign, created_at FROM leads').all();
    if (leads.length) {
      const { data, error } = await supabase.from('leads').insert(leads);
      if (error) console.error('Lỗi sync leads:', error.message);
      else summary.leads = leads.length;
    }

    console.log('✅ Hoàn tất đồng bộ dữ liệu lên Supabase:', summary);
    return { ok: true, summary };
  } catch (err) {
    console.error('❌ Lỗi khi đồng bộ lên Supabase:', err.message);
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  syncToSupabase().then(() => process.exit(0));
}

module.exports = { syncToSupabase };
