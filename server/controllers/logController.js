const { supabase, isSupabaseConfigured, checkSupabase, formatYMD } = require('../config/db');
const { formatHabitPayload } = require('./habitController');

exports.toggleLog = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habit_id, date } = req.body;
    const targetDate = date || formatYMD(new Date());

    if (!habit_id) {
      return res.status(400).json({ success: false, message: 'habit_id is required' });
    }

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
    let formattedHabit = null;
    try {
      const [hRes, lRes] = await Promise.all([
        supabase.from('habits').select('*').eq('id', habit_id).maybeSingle(),
        supabase.from('habit_logs').select('completed_date').eq('habit_id', habit_id)
      ]);
      if (hRes.data) {
        const logsList = (lRes.data || []).map(l => l.completed_date);
        formattedHabit = formatHabitPayload(hRes.data, logsList);
      }
    } catch (hErr) {
      console.warn('[toggleLog] Could not format habit payload:', hErr.message);
    }

    console.log(`[Log DB] Successfully toggled habit ${habit_id} on ${targetDate}. Completed: ${completed}`);
    return res.json({ success: true, completed, habit_id, date: targetDate, habit: formattedHabit });
  } catch (err) {
    console.error('[toggleLog] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
