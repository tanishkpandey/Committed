const express = require('express');
const router = express.Router();

// GET /auth/google - Starts Google OAuth login flow
router.get('/google', async (req, res) => {
  if (!req.supabase) {
    return res.status(500).send('Supabase client is not configured.');
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirectTo = `${protocol}://${host}/auth/callback`;

  console.log(`[Auth] Initiating Google sign-in. Host: ${host}, redirectTo: ${redirectTo}`);

  const { data, error } = await req.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('[Auth] Error initiating Google OAuth:', error.message);
    return res.redirect(`/landingpage?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) {
    console.log(`[Auth] Redirecting to Supabase OAuth URL: ${data.url}`);
    return res.redirect(data.url);
  }

  return res.redirect('/landingpage?error=Failed+to+generate+OAuth+URL');
});

// GET /auth/callback - Swaps the PKCE auth code for a session and redirects to /
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const errorMsg = req.query.error_description || req.query.error;

  console.log(`[Auth Callback] Received request. Code present: ${Boolean(code)}, error: ${errorMsg || 'none'}`);

  if (errorMsg) {
    console.error('[Auth Callback] OAuth callback error from provider:', errorMsg);
    return res.redirect(`/landingpage?error=${encodeURIComponent(errorMsg)}`);
  }

  if (code && req.supabase) {
    const { data, error } = await req.supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[Auth Callback] Error exchanging code for session:', error.message);
      return res.redirect(`/landingpage?error=${encodeURIComponent(error.message)}`);
    }
    console.log(`[Auth Callback] Successfully exchanged code! User ID: ${data?.user?.id}, Email: ${data?.user?.email}`);
  }

  // Redirect to / (which serves the Today dashboard for authenticated users)
  res.redirect('/');
});

// POST /auth/logout - Signs out the user and clears session cookies
router.post('/logout', async (req, res) => {
  if (req.supabase) {
    await req.supabase.auth.signOut();
  }
  return res.json({ success: true, message: 'Signed out successfully' });
});

// GET /auth/logout fallback for link clicks
router.get('/logout', async (req, res) => {
  if (req.supabase) {
    await req.supabase.auth.signOut();
  }
  return res.redirect('/landingpage');
});

// GET /auth/status - Public endpoint used by landing page and settings
router.get('/status', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (req.user) {
    const metadata = req.user.user_metadata || {};
    return res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: metadata.full_name || metadata.name || req.user.email?.split('@')[0] || 'User',
        avatar_url: metadata.avatar_url || metadata.picture || null
      }
    });
  }

  return res.json({
    authenticated: false,
    user: null
  });
});

module.exports = router;
