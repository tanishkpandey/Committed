const { supabase, isSupabaseConfigured, readLocalData } = require('../config/db');
const { evaluateProgression } = require('../services/progressionEngine');

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

exports.getProgression = async (req, res) => {
  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    
    // Omit allTransactions from base payload for efficiency, keep recentTransactions
    const { allTransactions, ...summary } = progression;
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('Error fetching progression:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getXPHistory = async (req, res) => {
  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    res.json({ success: true, transactions: progression.allTransactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAchievements = async (req, res) => {
  try {
    const { habits, logs } = await getHabitsAndLogs();
    const progression = evaluateProgression(habits, logs);
    res.json({ success: true, achievements: progression.achievements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
