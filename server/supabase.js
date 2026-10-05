// server/supabase.js — Supabase Client and utilities
const { createClient } = require('@supabase/supabase-js');

function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

let supabaseClient = null;

function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY).trim();
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

async function testSupabaseConnection() {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Chưa điền đủ SUPABASE_URL và KEY trong .env' };
  }

  try {
    const client = getSupabase();
    // Test simple select on branches or leads table
    const { data, error } = await client.from('branches').select('id, name').limit(1);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, message: 'Kết nối Supabase PostgreSQL thành công!', data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  isSupabaseConfigured,
  getSupabase,
  testSupabaseConnection,
};
