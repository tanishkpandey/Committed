const { createClient } = require('@supabase/supabase-js');
const { createServerClient, parseCookieHeader } = require('@supabase/ssr');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));

// Standard fallback anon client
let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[DB] Supabase anon client initialized with URL:', SUPABASE_URL);
  } catch (err) {
    console.error('[DB] Supabase anon client initialization failed:', err.message);
  }
} else {
  console.warn('[DB] Supabase is NOT configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Admin / Service Role client (strictly for administrative operations like backfill)
let adminSupabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[DB] Supabase admin (service role) client initialized.');
  } catch (err) {
    console.error('[DB] Supabase admin client initialization failed:', err.message);
  }
}

/**
 * Creates a per-request Supabase client using @supabase/ssr.
 * Reads cookies from request headers and writes session cookies to response.
 * Cookies: HttpOnly, Secure in production, SameSite=Lax.
 */
function createSupabaseServerClient(req, res) {
  if (!isSupabaseConfigured) return null;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookie(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        });
      },
    },
  });
}

function formatYMD(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function checkSupabase(res) {
  if (!isSupabaseConfigured) {
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
  adminSupabase,
  isSupabaseConfigured,
  createSupabaseServerClient,
  formatYMD,
  checkSupabase
};
