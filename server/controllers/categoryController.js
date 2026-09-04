const { supabase, isSupabaseConfigured, checkSupabase } = require('../config/db');

exports.getCategories = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const [cRes, hRes] = await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('habits').select('category')
    ]);
    if (cRes.error) throw cRes.error;

    const counts = {};
    (hRes.data || []).forEach(h => {
      counts[h.category] = (counts[h.category] || 0) + 1;
    });

    const enriched = (cRes.data || []).map(c => ({
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

  try {
    const { name, color = '#10B981' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const cleanName = name.trim();

    const { data, error } = await supabase.from('categories').insert([{ name: cleanName, color }]).select().single();
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

  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const { data: existing, error: fErr } = await supabase.from('categories').select('*').eq('id', id).single();
    if (fErr || !existing) return res.status(404).json({ success: false, message: 'Category not found' });

    const newName = name && name.trim() ? name.trim() : existing.name;
    const { data, error } = await supabase.from('categories').update({ name: newName, color: color || existing.color }).eq('id', id).select().single();
    if (error) throw error;

    if (existing.name !== newName) {
      await supabase.from('habits').update({ category: newName }).eq('category', existing.name);
    }

    return res.json({ success: true, category: data });
  } catch (err) {
    console.error('[updateCategory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { id } = req.params;

    const { data: existing, error: fErr } = await supabase.from('categories').select('*').eq('id', id).single();
    if (fErr || !existing) return res.status(404).json({ success: false, message: 'Category not found' });

    const { data: allCats } = await supabase.from('categories').select('*');
    if (!allCats || allCats.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only category' });
    }

    const remaining = allCats.find(c => c.id !== id);
    const targetName = remaining ? remaining.name : 'General';

    await supabase.from('habits').update({ category: targetName }).eq('category', existing.name);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: `Category deleted. Habits reassigned to ${targetName}.` });
  } catch (err) {
    console.error('[deleteCategory] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
