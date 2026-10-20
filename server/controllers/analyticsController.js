const { supabase, isSupabaseConfigured, checkSupabase, formatYMD } = require('../config/db');
const { generateAdvancedInsights } = require('../services/insightsEngine');

async function getHabitsAndLogs(req) {
  const db = (req && req.supabase) || supabase;
  const [hRes, lRes] = await Promise.all([
    db.from('habits').select('*'),
    db.from('habit_logs').select('*')
  ]);
  if (hRes.error) throw hRes.error;
  if (lRes.error) throw lRes.error;
  return { habits: hRes.data || [], logs: lRes.data || [] };
}

exports.getGlobalAnalytics = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs(req);
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

    // 3. Habit Distribution & Consistency (1m current month, 2m average, 3m average)
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    const getMonthInfo = (offset) => {
      const d = new Date(curYear, curMonth - offset, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const days = new Date(y, m + 1, 0).getDate();
      const name = d.toLocaleDateString('en-US', { month: 'short' });
      return { year: y, monthIndex: m, prefix, days, name };
    };

    const m0 = getMonthInfo(0); // Current month
    const m1 = getMonthInfo(1); // 1 month ago
    const m2 = getMonthInfo(2); // 2 months ago

    const habitDistribution = activeHabits.map((h, idx) => {
      const countForPrefix = (prefix) => {
        const set = new Set(
          logs.filter(l => l.completed_date && l.completed_date.startsWith(prefix) && l.habit_id === h.id)
              .map(l => l.completed_date)
        );
        return set.size;
      };

      const c0 = countForPrefix(m0.prefix);
      const c1 = countForPrefix(m1.prefix);
      const c2 = countForPrefix(m2.prefix);

      // 1m: Current month (0 - 100%)
      const pct1m = m0.days > 0 ? Math.min(100, Math.round((c0 / m0.days) * 100)) : 0;

      // 2m: Average of last 2 months (0 - 100%)
      const days2m = m0.days + m1.days;
      const count2m = c0 + c1;
      const pct2m = days2m > 0 ? Math.min(100, Math.round((count2m / days2m) * 100)) : 0;
      const avgCount2m = Math.round((count2m / 2) * 10) / 10;

      // 3m: Average of last 3 months (0 - 100%)
      const days3m = m0.days + m1.days + m2.days;
      const count3m = c0 + c1 + c2;
      const pct3m = days3m > 0 ? Math.min(100, Math.round((count3m / days3m) * 100)) : 0;
      const avgCount3m = Math.round((count3m / 3) * 10) / 10;

      const colorHex = getHabitColor(h, idx);
      return {
        id: h.id,
        title: h.title,
        color: colorHex,
        count: c0,
        percentage: pct1m,
        daysInMonth: m0.days,
        monthName: m0.name,
        timeframes: {
          '1m': {
            percentage: pct1m,
            count: c0,
            label: `${c0} of ${m0.days} days`,
            subtitle: `${m0.name}: ${pct1m}% completed`
          },
          '2m': {
            percentage: pct2m,
            count: avgCount2m,
            label: `${avgCount2m} days/mo avg`,
            subtitle: `2-mo avg (${m1.name}-${m0.name}): ${pct2m}%`
          },
          '3m': {
            percentage: pct3m,
            count: avgCount3m,
            label: `${avgCount3m} days/mo avg`,
            subtitle: `3-mo avg (${m2.name}-${m0.name}): ${pct3m}%`
          }
        }
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // 4. Monthly Check-ins History (All 12 Months)
    const monthlyCounts = [];
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthPrefix = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const year = targetDate.getFullYear();

      const count = logs.filter(l => l.completed_date && l.completed_date.startsWith(monthPrefix) && activeHabitIds.has(l.habit_id)).length;
      monthlyCounts.push({
        month: monthName,
        year,
        prefix: monthPrefix,
        count
      });
    }

    const totalAnnualLogs = monthlyCounts.reduce((acc, m) => acc + m.count, 0);

    res.json({
      success: true,
      analytics: {
        overview: insightsData.overview,
        cumulativeVelocity30,
        weekCurve,
        habitDistribution,
        behavioralInsights: insightsData.behavioralInsights,
        consistencyPatterns: insightsData.consistencyPatterns,
        monthlyCounts,
        totalAnnualLogs
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
  const db = (req && req.supabase) || supabase;

  try {
    const { habits, logs } = await getHabitsAndLogs(req);
    const { data: categories } = await db.from('categories').select('*');
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
  const db = (req && req.supabase) || supabase;

  try {
    const raw = req.body;
    if (!raw || !Array.isArray(raw.habits)) {
      return res.status(400).json({ success: false, error: 'Invalid backup file: habits array is required' });
    }

    let habits = raw.habits;
    let logs = raw.logs || [];

    for (const h of habits) {
      const habitPayload = {
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
      };
      if (req.user) {
        habitPayload.user_id = req.user.id;
      }
      await db.from('habits').upsert(habitPayload);
    }

    const BATCH = 50;
    for (let i = 0; i < logs.length; i += BATCH) {
      const batch = logs.slice(i, i + BATCH).map(l => {
        const item = {
          habit_id: l.habit_id,
          completed_date: l.completed_date,
          count: l.count || 1
        };
        if (req.user) {
          item.user_id = req.user.id;
        }
        return item;
      });
      await db.from('habit_logs').upsert(batch, { onConflict: 'habit_id, completed_date' });
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
