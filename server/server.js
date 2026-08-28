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

// Health check endpoint for Render / monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Committed', timestamp: new Date().toISOString() });
});

// Disable browser caching for instant development updates
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  maxAge: 0
}));

app.use('/api', apiRoutes);

// Fallback HTML routing
app.get('/progress', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'progress.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'analytics.html')));
app.get('/manage', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'manage-habits.html')));
app.get('/habit/:id', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'habit-detail.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'settings.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Committed App is live & listening on port ${PORT}!`);
  console.log(`📱 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
