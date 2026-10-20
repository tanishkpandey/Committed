const { createSupabaseServerClient } = require('../config/db');

/**
 * Global authentication middleware.
 * Initializes per-request Supabase client with cookie handlers and extracts the current user.
 */
async function attachAuth(req, res, next) {
  try {
    const client = createSupabaseServerClient(req, res);
    req.supabase = client;

    if (client) {
      const { data: { user } = {} } = await client.auth.getUser();
      req.user = user || null;
    } else {
      req.user = null;
    }
  } catch (err) {
    console.error('[Auth Middleware] Error getting user session:', err.message);
    req.user = null;
  }
  next();
}

/**
 * Guard for protected web pages.
 * Redirects unauthenticated visitors to /landingpage.
 */
function requirePageAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/landingpage');
  }
  next();
}

/**
 * Guard for protected API endpoints.
 * Returns 401 JSON without redirects if unauthenticated.
 */
function requireApiAuth(req, res, next) {
  // Public health check is always allowed
  if (req.path === '/health' || req.originalUrl === '/api/health') {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Please sign in with Google'
    });
  }
  next();
}

module.exports = {
  attachAuth,
  requirePageAuth,
  requireApiAuth
};
