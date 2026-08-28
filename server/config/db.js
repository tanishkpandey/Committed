const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));

let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[DB] Supabase client initialized.');
  } catch (err) {
    console.warn('[DB] Supabase initialization failed, falling back to local store.', err.message);
  }
}

// Local File-based JSON Store fallback with seeded habits
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function formatYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seedData = generateSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
  }
}

function generateSeedData() {
  const today = new Date();
  const getPastDateStr = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return formatYMD(d);
  };

  const habits = [
    {
      id: 'h-1',
      title: 'Morning Meditation',
      description: '15 mins mindfulness & breathing',
      category: 'Mindfulness',
      color: '#8B5CF6',
      icon: 'sparkles',
      frequency_days: 7,
      grid_days: 60,
      tile_shape: 'tile-rounded',
      is_archived: false,
      order_index: 0,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'h-2',
      title: 'Workout & Fitness',
      description: 'Weightlifting or 5km run',
      category: 'Fitness',
      color: '#10B981',
      icon: 'dumbbell',
      frequency_days: 5,
      grid_days: 60,
      tile_shape: 'tile-rounded',
      is_archived: false,
      order_index: 1,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'h-3',
      title: 'Drink 3L Water',
      description: 'Stay hydrated throughout the day',
      category: 'Health',
      color: '#06B6D4',
      icon: 'droplets',
      frequency_days: 7,
      grid_days: 60,
      tile_shape: 'tile-rounded',
      is_archived: false,
      order_index: 2,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'h-4',
      title: 'Read 20 Pages',
      description: 'Non-fiction or personal growth',
      category: 'Learning',
      color: '#F59E0B',
      icon: 'book-open',
      frequency_days: 6,
      grid_days: 60,
      tile_shape: 'tile-rounded',
      is_archived: false,
      order_index: 3,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'h-5',
      title: 'Coding & Side Project',
      description: 'Build features & commit code',
      category: 'Productivity',
      color: '#EC4899',
      icon: 'code',
      frequency_days: 5,
      grid_days: 60,
      tile_shape: 'tile-rounded',
      is_archived: false,
      order_index: 4,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    }
  ];

  const logs = [];
  const patterns = [
    [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 14, 15, 16, 17, 19, 21, 22, 23, 25, 27, 28, 29, 30, 31, 35, 36, 40],
    [0, 1, 3, 4, 6, 7, 8, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25, 27, 28, 29, 31, 32, 35, 38],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    [0, 1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27, 29, 30, 32, 34, 37],
    [0, 1, 2, 3, 5, 6, 7, 8, 10, 12, 13, 14, 15, 17, 19, 20, 21, 22, 24, 26, 27, 28, 30, 31, 33, 35]
  ];

  habits.forEach((h, idx) => {
    const dayIndices = patterns[idx] || patterns[0];
    dayIndices.forEach(dayAgo => {
      logs.push({
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        habit_id: h.id,
        completed_date: getPastDateStr(dayAgo),
        count: 1,
        created_at: new Date().toISOString()
      });
    });
  });

  return {
    habits,
    logs,
    categories: [
      { id: 'cat-1', name: 'General', color: '#6B7280' },
      { id: 'cat-2', name: 'Fitness', color: '#10B981' },
      { id: 'cat-3', name: 'Mindfulness', color: '#8B5CF6' },
      { id: 'cat-4', name: 'Health', color: '#06B6D4' },
      { id: 'cat-5', name: 'Learning', color: '#F59E0B' },
      { id: 'cat-6', name: 'Productivity', color: '#EC4899' }
    ],
    settings: {
      theme: 'dark',
      sound_enabled: true,
      confetti_enabled: true,
      default_grid_days: 60
    }
  };
}

function readLocalData() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return generateSeedData();
  }
}

function writeLocalData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  readLocalData,
  writeLocalData,
  formatYMD
};
