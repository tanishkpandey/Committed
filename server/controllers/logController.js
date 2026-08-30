const { supabase, isSupabaseConfigured, readLocalData, writeLocalData, formatYMD } = require('../config/db');
const { formatHabitPayload } = require('./habitController');

exports.toggleLog = async (req, res) => {
  try {
    const { habit_id, date } = req.body;
    const targetDate = date || formatYMD(new Date());

    if (!habit_id) {
      return res.status(400).json({ success: false, message: 'habit_id is required' });
    }

    if (isSupabaseConfigured && supabase) {
      const { data: existing, error: fetchErr } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habit_id)
        .eq('completed_date', targetDate)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      let completed = false;
      if (existing) {
        const { error: delErr } = await supabase.from('habit_logs').delete().eq('id', existing.id);
        if (delErr) throw delErr;
        completed = false;
      } else {
        const { error: insErr } = await supabase.from('habit_logs').insert([{
          habit_id,
          completed_date: targetDate,
          count: 1
        }]);
        if (insErr) throw insErr;
        completed = true;
      }

      // Fetch updated habit with its logs
      const { data: habit, error: habitErr } = await supabase
        .from('habits')
        .select('*, habit_logs(*)')
        .eq('id', habit_id)
        .single();

      const formattedHabit = habit ? formatHabitPayload(habit, habit.habit_logs || []) : null;

      return res.json({ success: true, completed, habit_id, date: targetDate, habit: formattedHabit });
    }

    const store = readLocalData();
    store.logs = store.logs || [];
    store.habits = store.habits || [];
    
    const existingIndex = store.logs.findIndex(
      l => l.habit_id === habit_id && l.completed_date === targetDate
    );

    let completed = false;
    if (existingIndex !== -1) {
      store.logs.splice(existingIndex, 1);
      completed = false;
    } else {
      store.logs.push({
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        habit_id,
        completed_date: targetDate,
        count: 1,
        created_at: new Date().toISOString()
      });
      completed = true;
    }

    writeLocalData(store);

    const habit = store.habits.find(h => h.id === habit_id);
    const habitLogs = store.logs.filter(l => l.habit_id === habit_id);
    const formattedHabit = habit ? formatHabitPayload(habit, habitLogs) : null;

    res.json({ success: true, completed, habit_id, date: targetDate, habit: formattedHabit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
