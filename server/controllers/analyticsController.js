const { supabase, isSupabaseConfigured, readLocalData, writeLocalData, formatYMD } = require('../config/db');
const { generateAdvancedInsights } = require('../services/insightsEngine');

async function getHabitsAndLogs() {
  if (isSupabaseConfigured && supabase) {
    const [hRes, lRes] = await Promise.all([
      supabase.from('habits').select('*'),
      supabase.from('habit_logs').select('*')
    ]);
    return { habits: hRes.data || [], logs: lRes.data || [] };
  }
  const store = readLocalData();
  return { habits: store.habits || [], logs: store.logs || [] };
}

exports.getGlobalAnalytics = async (req, res) => {
  try {
    const { habits, logs } = await getHabitsAndLogs();
    const insightsData = generateAdvancedInsights(habits, logs);
    const activeHabits = habits.filter(h => !h.is_archived);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();

    // Helper: format Date to YYYY-MM-DD
    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // 1. 30-Day Cumulative Check-In Velocity
    const cumulativeVelocity30 = [];
    let runningTotal = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = toYMD(d);
      const dayLogs = logs.filter(l => l.completed_date === dStr).length;
      runningTotal += dayLogs;
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();

      cumulativeVelocity30.push({
        date: dStr,
        label: `${monthShort} ${dayNum}`,
        dailyCount: dayLogs,
        cumulativeCount: runningTotal
      });
    }

    // 2. Weekly Completion Rate Curve (Last 7 Days)
    const weekCurve = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = toYMD(d);
      const dayName = dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const dayLogs = logs.filter(l => l.completed_date === dStr).length;
      const possible = Math.max(activeHabits.length, 1);
      const rate = Math.min(100, Math.round((dayLogs / possible) * 100));

      weekCurve.push({
        date: dStr,
        day: dayName,
        rate: Math.max(0, rate)
      });
    }

    const PALETTE = ['#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#3B82F6', '#6366F1', '#F43F5E'];
    const getHabitColor = (h, index) => {
      if (h.color && h.color.startsWith('#')) return h.color;
      if (h.color && COLOR_MAP[h.color]) return COLOR_MAP[h.color];
      return PALETTE[index % PALETTE.length];
    };

    // 3. Habit Distribution & Balance (Last 30 Days Breakdown)
    const cutoff30 = new Date(today);
    cutoff30.setDate(today.getDate() - 30);
    const cutoff30Str = toYMD(cutoff30);

    const logsLast30 = logs.filter(l => l.completed_date >= cutoff30Str);
    const total30Logs = Math.max(logsLast30.length, 1);

    const habitDistribution = activeHabits.map((h, idx) => {
      const count = logsLast30.filter(l => l.habit_id === h.id).length;
      const pct = Math.round((count / total30Logs) * 100);
      const colorHex = getHabitColor(h, idx);
      return {
        id: h.id,
        title: h.title,
        color: colorHex,
        count,
        percentage: pct
      };
    }).sort((a, b) => b.count - a.count);

    // 4. Monthly Check-ins History (Last 6 Months)
    const monthlyCounts = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthPrefix = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });

      const count = logs.filter(l => l.completed_date && l.completed_date.startsWith(monthPrefix)).length;
      monthlyCounts.push({
        month: monthName,
        prefix: monthPrefix,
        count
      });
    }

    res.json({
      success: true,
      analytics: {
        overview: insightsData.overview,
        cumulativeVelocity30,
        weekCurve,
        habitDistribution,
        behavioralInsights: insightsData.behavioralInsights,
        consistencyPatterns: insightsData.consistencyPatterns,
        monthlyCounts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const COLOR_MAP = {
  rose: '#F43F5E', red: '#EF4444', stone: '#78716C', orange: '#F97316',
  green: '#10B981', sky: '#0EA5E9', yellow: '#EAB308', indigo: '#6366F1',
  fuchsia: '#D946EF', blue: '#3B82F6', purple: '#8B5CF6', emerald: '#10B981'
};

exports.exportBackup = async (req, res) => {
  try {
    const store = readLocalData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=committed_backup.json');
    res.send(JSON.stringify(store, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.importBackup = async (req, res) => {
  try {
    const raw = req.body;
    if (!raw || !Array.isArray(raw.habits)) {
      return res.status(400).json({ success: false, error: 'Invalid backup file: habits array is required' });
    }

    let habits = [];
    let logs = [];

    const isMobileExport = Array.isArray(raw.completions) || (raw.habits[0] && raw.habits[0].name !== undefined);

    if (isMobileExport) {
      habits = raw.habits.map(h => ({
        id: h.id || ('h-' + Math.random().toString(36).substr(2, 9)),
        title: h.name || h.title || 'Habit',
        description: h.description || '',
        category: 'General',
        color: COLOR_MAP[h.color] || h.color || '#10B981',
        icon: 'zap',
        frequency_days: 7,
        grid_days: 365,
        tile_shape: 'tile-rounded',
        is_archived: Boolean(h.archived || h.is_archived),
        order_index: h.orderIndex || h.order_index || 0,
        created_at: h.createdAt || h.created_at || new Date().toISOString()
      }));

      const completions = raw.completions || [];
      const logsMap = new Map();

      completions.forEach(c => {
        if (c.amountOfCompletions !== undefined && c.amountOfCompletions <= 0) return;
        const habitId = c.habitId || c.habit_id;
        if (!habitId) return;

        let localDate = '';
        if (c.date) {
          const dt = new Date(c.date);
          const offsetMs = (c.timezoneOffsetInMinutes || 0) * 60 * 1000;
          const adjusted = new Date(dt.getTime() + offsetMs);
          localDate = formatYMD(adjusted);
        }

        if (localDate) {
          const key = `${habitId}_${localDate}`;
          if (!logsMap.has(key)) {
            logsMap.set(key, {
              id: c.id || `log-${key}`,
              habit_id: habitId,
              completed_date: localDate,
              count: 1
            });
          }
        }
      });

      logs = Array.from(logsMap.values());
    } else {
      habits = raw.habits;
      logs = raw.logs || [];
    }

    const payload = {
      habits,
      logs,
      categories: raw.categories || [
        { id: 'cat-1', name: 'General', color: '#6B7280' },
        { id: 'cat-2', name: 'Fitness', color: '#10B981' },
        { id: 'cat-3', name: 'Mindfulness', color: '#8B5CF6' },
        { id: 'cat-4', name: 'Health', color: '#06B6D4' },
        { id: 'cat-5', name: 'Learning', color: '#F59E0B' },
        { id: 'cat-6', name: 'Productivity', color: '#EC4899' }
      ],
      settings: raw.settings || {
        theme: 'dark',
        sound_enabled: true,
        confetti_enabled: true,
        default_grid_days: 365
      }
    };

    writeLocalData(payload);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('habit_logs').delete().neq('completed_date', '1970-01-01');
      await supabase.from('habits').delete().neq('title', '___none___');

      for (const h of habits) {
        await supabase.from('habits').upsert({
          id: h.id,
          title: h.title,
          description: h.description,
          category: h.category,
          color: h.color,
          icon: h.icon,
          frequency_days: h.frequency_days || 7,
          grid_days: h.grid_days || 365,
          tile_shape: h.tile_shape || 'tile-rounded',
          is_archived: h.is_archived,
          order_index: h.order_index,
          created_at: h.created_at
        });
      }

      const BATCH = 50;
      for (let i = 0; i < logs.length; i += BATCH) {
        const batch = logs.slice(i, i + BATCH).map(l => ({
          habit_id: l.habit_id,
          completed_date: l.completed_date,
          count: l.count || 1
        }));
        await supabase.from('habit_logs').upsert(batch, { onConflict: 'habit_id, completed_date' });
      }
    }

    res.json({
      success: true,
      message: `Imported ${habits.length} habits and ${logs.length} completion logs successfully!`
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
