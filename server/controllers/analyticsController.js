const { supabase, isSupabaseConfigured, checkSupabase, formatYMD } = require('../config/db');
const { generateAdvancedInsights } = require('../services/insightsEngine');

async function getHabitsAndLogs() {
  const [hRes, lRes] = await Promise.all([
    supabase.from('habits').select('*'),
    supabase.from('habit_logs').select('*')
  ]);
  if (hRes.error) throw hRes.error;
  if (lRes.error) throw lRes.error;
  return { habits: hRes.data || [], logs: lRes.data || [] };
}

exports.getGlobalAnalytics = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs();
    const insightsData = generateAdvancedInsights(habits, logs);
    const activeHabits = habits.filter(h => !h.is_archived);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();

    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const activeHabitIds = new Set(activeHabits.map(h => h.id));

    // 1. 30-Day Cumulative Check-In Velocity
    const cumulativeVelocity30 = [];
    let runningTotal = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = toYMD(d);
      const dayLogs = logs.filter(l => l.completed_date === dStr && activeHabitIds.has(l.habit_id)).length;
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
      const dayLogs = logs.filter(l => l.completed_date === dStr && activeHabitIds.has(l.habit_id)).length;
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

    const logsLast30 = logs.filter(l => l.completed_date >= cutoff30Str && activeHabitIds.has(l.habit_id));
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

      const count = logs.filter(l => l.completed_date && l.completed_date.startsWith(monthPrefix) && activeHabitIds.has(l.habit_id)).length;
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
    console.error('[getGlobalAnalytics] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const COLOR_MAP = {
  rose: '#F43F5E', red: '#EF4444', stone: '#78716C', orange: '#F97316',
  green: '#10B981', sky: '#0EA5E9', yellow: '#EAB308', indigo: '#6366F1',
  fuchsia: '#D946EF', blue: '#3B82F6', purple: '#8B5CF6', emerald: '#10B981'
};

exports.exportBackup = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs();
    const { data: categories } = await supabase.from('categories').select('*');
    const backupData = {
      habits,
      logs,
      categories: categories || []
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=committed_supabase_backup.json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('[exportBackup] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.importBackup = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const raw = req.body;
    if (!raw || !Array.isArray(raw.habits)) {
      return res.status(400).json({ success: false, error: 'Invalid backup file: habits array is required' });
    }

    let habits = raw.habits;
    let logs = raw.logs || [];

    for (const h of habits) {
      await supabase.from('habits').upsert({
        id: h.id,
        title: h.title,
        description: h.description || '',
        category: h.category || 'General',
        color: h.color || '#10B981',
        icon: h.icon || 'zap',
        frequency_days: h.frequency_days || 7,
        grid_days: h.grid_days || 60,
        tile_shape: h.tile_shape || 'tile-rounded',
        is_archived: Boolean(h.is_archived),
        order_index: h.order_index || 0,
        created_at: h.created_at || new Date().toISOString()
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

    res.json({
      success: true,
      message: `Imported ${habits.length} habits and ${logs.length} completion logs into Supabase successfully!`
    });
  } catch (err) {
    console.error('[importBackup] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
