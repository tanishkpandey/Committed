const { supabase, isSupabaseConfigured, checkSupabase } = require('../config/db');

const DEFAULT_CATEGORIES = [
  { name: 'General', color: '#6B7280' },
  { name: 'Fitness', color: '#10B981' },
  { name: 'Mindfulness', color: '#8B5CF6' },
  { name: 'Health', color: '#06B6D4' },
  { name: 'Learning', color: '#F59E0B' },
  { name: 'Productivity', color: '#EC4899' }
];

exports.getCategories = async (req, res) => {
  if (!checkSupabase(res)) return;
  const db = req.supabase || supabase;

  try {
    let [cRes, hRes] = await Promise.all([
      db.from('categories').select('*').order('name', { ascending: true }),
      db.from('habits').select('category')
    ]);
    if (cRes.error) throw cRes.error;

    let categories = cRes.data || [];

    // Auto-seed default categories for first-time user if they have 0 categories
    if (categories.length === 0 && req.user) {
      try {
        const seedPayload = DEFAULT_CATEGORIES.map(c => ({
          ...c,
          user_id: req.user.id
        }));
        await db.from('categories').insert(seedPayload);
        const recheck = await db.from('categories').select('*').order('name', { ascending: true });
        categories = recheck.data || [];
      } catch (seedErr) {
        console.warn('[getCategories] Could not auto-seed default categories:', seedErr.message);
      }
    }

    const counts = {};
    (hRes.data || []).forEach(h => {
      counts[h.category] = (counts[h.category] || 0) + 1;
    });

    const enriched = categories.map(c => ({
      ...c,
      habitsCount: counts[c.name] || 0
    }));

    return res.json({ success: true, categories: enriched });
  } catch (err) {
    console.error('[getCategories] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCategory = async (req, res) => {
  if (!checkSupabase(res)) return;
  const db = req.supabase || supabase;

  try {
    const { name, color = '#10B981' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const cleanName = name.trim();

    const insertPayload = { name: cleanName, color };
    if (req.user) {
      insertPayload.user_id = req.user.id;
    }

    const { data, error } = await db.from('categories').insert([insertPayload]).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ success: false, message: 'Category already exists' });
      throw error;
    }
    return res.status(201).json({ success: true, category: data });
  } catch (err) {
    console.error('[createCategory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  if (!checkSupabase(res)) return;
  const db = req.supabase || supabase;

  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const { data: existing, error: fErr } = await db.from('categories').select('*').eq('id', id).single();
    if (fErr || !existing) return res.status(404).json({ success: false, message: 'Category not found' });

    const newName = name && name.trim() ? name.trim() : existing.name;
    const { data, error } = await db.from('categories').update({ name: newName, color: color || existing.color }).eq('id', id).select().single();
    if (error) throw error;

    if (existing.name !== newName) {
      await db.from('habits').update({ category: newName }).eq('category', existing.name);
    }

    return res.json({ success: true, category: data });
  } catch (err) {
    console.error('[updateCategory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  if (!checkSupabase(res)) return;
  const db = req.supabase || supabase;

  try {
    const { id } = req.params;

    const { data: existing, error: fErr } = await db.from('categories').select('*').eq('id', id).single();
    if (fErr || !existing) return res.status(404).json({ success: false, message: 'Category not found' });

    const { data: allCats } = await db.from('categories').select('*');
    if (!allCats || allCats.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only category' });
    }

    const remaining = allCats.find(c => c.id !== id);
    const targetName = remaining ? remaining.name : 'General';

    await db.from('habits').update({ category: targetName }).eq('category', existing.name);
    const { error } = await db.from('categories').delete().eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: `Category deleted. Habits reassigned to ${targetName}.` });
  } catch (err) {
    console.error('[deleteCategory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
