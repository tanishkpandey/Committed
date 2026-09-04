const { supabase, isSupabaseConfigured, checkSupabase, formatYMD } = require('../config/db');

function calculateHabitStreaks(datesSet, frequencyDays = 7) {
  const today = new Date();

  // Daily Habit (7 days/week)
  if (frequencyDays >= 7) {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    let checkDate = new Date(today);
    if (!datesSet.has(formatYMD(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (datesSet.has(formatYMD(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const sortedDates = Array.from(datesSet).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const [py, pm, pd] = sortedDates[i - 1].split('-').map(Number);
        const [cy, cm, cd] = sortedDates[i].split('-').map(Number);
        const diffDays = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) tempStreak++;
        else if (diffDays > 1) tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak, isWeekly: false, unit: 'd' };
  }

  // Flexible Habit (1 to 6 days/week): Weekly Target Streaks
  const weeksMap = new Map();
  datesSet.forEach(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - dateObj.getDay());
    const weekKey = formatYMD(weekStart);

    weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
  });

  const curWeekStart = new Date(today);
  curWeekStart.setDate(today.getDate() - today.getDay());
  const curWeekKey = formatYMD(curWeekStart);

  let currentWeeklyStreak = 0;
  let checkWeek = new Date(curWeekStart);

  const curWeekCount = weeksMap.get(curWeekKey) || 0;
  if (curWeekCount >= frequencyDays) {
    currentWeeklyStreak++;
    checkWeek.setDate(checkWeek.getDate() - 7);
  } else {
    checkWeek.setDate(checkWeek.getDate() - 7);
  }

  while (true) {
    const wKey = formatYMD(checkWeek);
    const count = weeksMap.get(wKey) || 0;
    if (count >= frequencyDays) {
      currentWeeklyStreak++;
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else {
      break;
    }
  }

  const sortedWeekKeys = Array.from(weeksMap.keys()).sort();
  let longestWeeklyStreak = 0;
  let tempWStreak = 0;

  for (let i = 0; i < sortedWeekKeys.length; i++) {
    const wKey = sortedWeekKeys[i];
    const count = weeksMap.get(wKey) || 0;

    if (count >= frequencyDays) {
      if (tempWStreak === 0) {
        tempWStreak = 1;
      } else {
        const [py, pm, pd] = sortedWeekKeys[i - 1].split('-').map(Number);
        const [cy, cm, cd] = wKey.split('-').map(Number);
        const diffWeeks = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (7 * 24 * 3600 * 1000));
        if (diffWeeks === 1) tempWStreak++;
        else tempWStreak = 1;
      }
      if (tempWStreak > longestWeeklyStreak) longestWeeklyStreak = tempWStreak;
    } else {
      tempWStreak = 0;
    }
  }

  return {
    currentStreak: currentWeeklyStreak,
    longestStreak: Math.max(longestWeeklyStreak, currentWeeklyStreak),
    isWeekly: true,
    unit: 'w'
  };
}

function getWeeklyQuotaProgress(datesSet, frequencyDays = 7) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  let thisWeekCompleted = 0;
  for (let i = 0; i <= today.getDay(); i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (datesSet.has(formatYMD(d))) thisWeekCompleted++;
  }

  return {
    thisWeekCompleted,
    thisWeekTarget: frequencyDays || 7,
    isTargetMetThisWeek: thisWeekCompleted >= (frequencyDays || 7)
  };
}

function formatHabitPayload(habit, logs = []) {
  const freq = habit.frequency_days || 7;
  const completedDates = logs.map(l => (typeof l === 'string' ? l : l.completed_date));
  const datesSet = new Set(completedDates);
  const { currentStreak, longestStreak, isWeekly, unit } = calculateHabitStreaks(datesSet, freq);
  const weeklyQuota = getWeeklyQuotaProgress(datesSet, freq);

  const last30 = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last30.push(formatYMD(d));
  }
  const last30Completed = last30.filter(d => datesSet.has(d)).length;
  const expected30Target = Math.max(1, Math.round((freq / 7) * 30));
  const completionRate = Math.min(100, Math.round((last30Completed / expected30Target) * 100));

  return {
    ...habit,
    frequency_days: freq,
    logs: completedDates,
    currentStreak,
    longestStreak,
    isWeeklyStreak: isWeekly,
    streakUnit: unit,
    completionRate,
    totalCompletions: completedDates.length,
    ...weeklyQuota
  };
}

exports.getHabits = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { category, include_archived } = req.query;

    try {
      let query = supabase.from('habits').select('*, habit_logs(*)').order('order_index', { ascending: true });
      if (category && category !== 'All') query = query.eq('category', category);
      if (include_archived !== 'true') query = query.eq('is_archived', false);

      const { data, error } = await query;
      if (error) throw error;
      const habits = data || [];
      const formatted = habits.map(h => formatHabitPayload(h, h.habit_logs || []));
      return res.json({ success: true, habits: formatted });
    } catch (nestedErr) {
      console.warn('[getHabits] Query fallback triggered:', nestedErr.message);
      let hQuery = supabase.from('habits').select('*').order('order_index', { ascending: true });
      if (category && category !== 'All') hQuery = hQuery.eq('category', category);
      if (include_archived !== 'true') hQuery = hQuery.eq('is_archived', false);

      const [hRes, lRes] = await Promise.all([
        hQuery,
        supabase.from('habit_logs').select('habit_id, completed_date')
      ]);
      if (hRes.error) throw hRes.error;

      const logsByHabit = new Map();
      (lRes.data || []).forEach(l => {
        if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
        logsByHabit.get(l.habit_id).push(l.completed_date);
      });

      const formatted = (hRes.data || []).map(h => formatHabitPayload(h, logsByHabit.get(h.id) || []));
      return res.json({ success: true, habits: formatted });
    }
  } catch (err) {
    console.error('[getHabits] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getHabitById = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { id } = req.params;

    try {
      const { data: habit, error } = await supabase
        .from('habits')
        .select('*, habit_logs(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

      return res.json({ success: true, habit: formatHabitPayload(habit, habit.habit_logs || []) });
    } catch (nestedErr) {
      const [hRes, lRes] = await Promise.all([
        supabase.from('habits').select('*').eq('id', id).single(),
        supabase.from('habit_logs').select('completed_date').eq('habit_id', id)
      ]);
      if (hRes.error || !hRes.data) return res.status(404).json({ success: false, message: 'Habit not found' });
      const logsList = (lRes.data || []).map(l => l.completed_date);
      return res.json({ success: true, habit: formatHabitPayload(hRes.data, logsList) });
    }
  } catch (err) {
    console.error('[getHabitById] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createHabit = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const {
      title,
      description = '',
      category = 'General',
      color = '#10B981',
      icon = 'zap',
      frequency_days = 7,
      grid_days = 60,
      tile_shape = 'tile-rounded'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const freq = Math.max(1, Math.min(7, Number(frequency_days) || 7));
    const newHabitData = {
      title: title.trim(),
      description: description.trim(),
      category: category || 'General',
      color,
      icon,
      frequency_days: freq,
      grid_days: Number(grid_days) || 60,
      tile_shape: tile_shape || 'tile-rounded',
      is_archived: false,
      order_index: Date.now()
    };

    const { data, error } = await supabase.from('habits').insert([newHabitData]).select().single();
    if (error) throw error;
    return res.status(201).json({ success: true, habit: formatHabitPayload(data, []) });
  } catch (err) {
    console.error('[createHabit] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateHabit = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.frequency_days !== undefined) {
      updates.frequency_days = Math.max(1, Math.min(7, Number(updates.frequency_days) || 7));
    }

    const { data, error } = await supabase
      .from('habits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const { data: logsData } = await supabase.from('habit_logs').select('completed_date').eq('habit_id', id);
    const logsList = (logsData || []).map(l => l.completed_date);
    return res.json({ success: true, habit: formatHabitPayload(data, logsList) });
  } catch (err) {
    console.error('[updateHabit] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteHabit = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { id } = req.params;

    // 1. Explicitly clean up child logs and XP transactions first
    await supabase.from('habit_logs').delete().eq('habit_id', id);
    await supabase.from('xp_transactions').delete().eq('habit_id', id);

    // 2. Delete the habit from Supabase
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) throw error;
    console.log(`[Habit DB] Deleted habit ${id} and associated logs from Supabase.`);
    return res.json({ success: true, message: 'Habit deleted' });
  } catch (err) {
    console.error('[deleteHabit] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.formatHabitPayload = formatHabitPayload;
exports.calculateHabitStreaks = calculateHabitStreaks;
exports.getWeeklyQuotaProgress = getWeeklyQuotaProgress;
