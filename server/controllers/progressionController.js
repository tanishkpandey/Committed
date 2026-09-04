const { supabase, isSupabaseConfigured, checkSupabase } = require('../config/db');
const { evaluateProgression } = require('../services/progressionEngine');

async function getHabitsAndLogs() {
  const [hRes, lRes] = await Promise.all([
    supabase.from('habits').select('*'),
    supabase.from('habit_logs').select('*')
  ]);
  if (hRes.error) throw hRes.error;
  if (lRes.error) throw lRes.error;
  return { habits: hRes.data || [], logs: lRes.data || [] };
}

exports.getProgression = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    
    // Omit allTransactions from base payload for efficiency, keep recentTransactions
    const { allTransactions, ...summary } = progression;
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[getProgression] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getXPHistory = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    res.json({ success: true, transactions: progression.allTransactions });
  } catch (err) {
    console.error('[getXPHistory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAchievements = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    res.json({ success: true, achievements: progression.achievements });
  } catch (err) {
    console.error('[getAchievements] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
