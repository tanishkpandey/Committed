require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { attachAuth, requirePageAuth, requireApiAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxies (such as Render) for HTTPS & protocol detection
app.set('trust proxy', 1);

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for monitoring & real-time connection verification (public)
const healthHandler = (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({
    status: 'ok',
    mode: 'online-only',
    app: 'Committed',
    commit: process.env.RENDER_GIT_COMMIT || 'local-dev',
    branch: process.env.RENDER_GIT_BRANCH || 'main',
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Performance & Security Headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Connection', 'keep-alive');
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Attach per-request Supabase client and resolve session user
app.use(attachAuth);

// Authentication Routes (GET /auth/google, GET /auth/callback, POST /auth/logout, GET /auth/status)
app.use('/auth', authRoutes);

// Clean HTML page redirects (e.g. /analytics.html -> /analytics)
app.get('/analytics.html', (req, res) => res.redirect('/analytics'));
app.get('/index.html', (req, res) => res.redirect('/today'));
app.get('/habits.html', (req, res) => res.redirect('/habits'));
app.get('/progress.html', (req, res) => res.redirect('/progress'));
app.get('/settings.html', (req, res) => res.redirect('/settings'));

// Static assets: strictly disable caching for HTML to enforce online operation
// index: false prevents Express static from implicitly serving index.html on GET /
app.use(express.static(path.join(__dirname, '..', 'public'), {
  index: false,
  etag: false,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Protected API Routes (returns 401 JSON if signed out)
app.use('/api', requireApiAuth, apiRoutes);

// Fallback HTML routing with anti-cache headers
const sendFreshHtml = (filePath) => (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(filePath);
};

// Root route: signed in -> Today app; signed out -> redirect to /landingpage
app.get('/', (req, res) => {
  if (!req.user) {
    return res.redirect('/landingpage');
  }
  return sendFreshHtml(path.join(__dirname, '..', 'public', 'index.html'))(req, res);
});

// Protected App Page Routes
app.get('/today', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/habits', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'habits.html')));
app.get('/progress', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'progress.html')));
app.get('/analytics', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'analytics.html')));
app.get('/habit/:id', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'habit-detail.html')));
app.get('/settings', requirePageAuth, sendFreshHtml(path.join(__dirname, '..', 'public', 'settings.html')));

// Public Landing Page (accessible to everyone)
app.get('/landingpage', sendFreshHtml(path.join(__dirname, '..', 'public', 'landingpage.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Committed App is live & listening on port ${PORT}!`);
  console.log(`📱 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
