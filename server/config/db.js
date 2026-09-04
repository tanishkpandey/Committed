const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));

let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[DB] Supabase client initialized with URL:', SUPABASE_URL);
  } catch (err) {
    console.error('[DB] Supabase initialization failed:', err.message);
  }
} else {
  console.warn('[DB] Supabase is NOT configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

function formatYMD(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function checkSupabase(res) {
  if (!isSupabaseConfigured || !supabase) {
    res.status(503).json({
      success: false,
      error: 'Database unavailable: Supabase is not connected. Please verify your SUPABASE_URL and SUPABASE_ANON_KEY credentials.'
    });
    return false;
  }
  return true;
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  formatYMD,
  checkSupabase
};
