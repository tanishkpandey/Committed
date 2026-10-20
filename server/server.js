require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for monitoring & real-time connection verification
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
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Static assets: strictly disable caching for HTML to enforce online operation
app.use(express.static(path.join(__dirname, '..', 'public'), {
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

app.use('/api', apiRoutes);

// Fallback HTML routing with anti-cache headers
const sendFreshHtml = (filePath) => (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(filePath);
};

app.get('/today', sendFreshHtml(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/habits', sendFreshHtml(path.join(__dirname, '..', 'public', 'habits.html')));
app.get('/progress', sendFreshHtml(path.join(__dirname, '..', 'public', 'progress.html')));
app.get('/analytics', sendFreshHtml(path.join(__dirname, '..', 'public', 'analytics.html')));
app.get('/habit/:id', sendFreshHtml(path.join(__dirname, '..', 'public', 'habit-detail.html')));
app.get('/settings', sendFreshHtml(path.join(__dirname, '..', 'public', 'settings.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Committed App is live & listening on port ${PORT}!`);
  console.log(`📱 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
