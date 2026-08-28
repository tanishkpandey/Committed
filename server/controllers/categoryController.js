const { supabase, isSupabaseConfigured, readLocalData, writeLocalData } = require('../config/db');

exports.getCategories = async (req, res) => {
  try {
    if (isSupabaseConfigured && supabase) {
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
    }

    const store = readLocalData();
    const categories = store.categories || [];
    const habits = store.habits || [];
    const counts = {};
    habits.forEach(h => {
      counts[h.category] = (counts[h.category] || 0) + 1;
    });

    const enriched = categories.map(c => ({
      ...c,
      habitsCount: counts[c.name] || 0
    }));

    res.json({ success: true, categories: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, color = '#10B981' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const cleanName = name.trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').insert([{ name: cleanName, color }]).select().single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ success: false, message: 'Category already exists' });
        throw error;
      }
      return res.status(201).json({ success: true, category: data });
    }

    const store = readLocalData();
    if (!store.categories) store.categories = [];
    if (store.categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const newCat = {
      id: 'cat-' + Math.random().toString(36).substr(2, 9),
      name: cleanName,
      color: color || '#10B981'
    };
    store.categories.push(newCat);
    writeLocalData(store);

    res.status(201).json({ success: true, category: newCat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (isSupabaseConfigured && supabase) {
      const { data: existing, error: fErr } = await supabase.from('categories').select('*').eq('id', id).single();
      if (fErr || !existing) return res.status(404).json({ success: false, message: 'Category not found' });

      const newName = name && name.trim() ? name.trim() : existing.name;
      const { data, error } = await supabase.from('categories').update({ name: newName, color: color || existing.color }).eq('id', id).select().single();
      if (error) throw error;

      if (existing.name !== newName) {
        await supabase.from('habits').update({ category: newName }).eq('category', existing.name);
      }

      return res.json({ success: true, category: data });
    }

    const store = readLocalData();
    const idx = (store.categories || []).findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Category not found' });

    const oldName = store.categories[idx].name;
    const newName = name && name.trim() ? name.trim() : oldName;
    store.categories[idx].name = newName;
    if (color) store.categories[idx].color = color;

    if (oldName !== newName && store.habits) {
      store.habits.forEach(h => {
        if (h.category === oldName) h.category = newName;
      });
    }

    writeLocalData(store);
    res.json({ success: true, category: store.categories[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
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
    }

    const store = readLocalData();
    const idx = (store.categories || []).findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Category not found' });

    const catToDelete = store.categories[idx];
    if (store.categories.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only category' });
    }

    const remainingCat = store.categories.find(c => c.id !== id);
    const targetCatName = remainingCat ? remainingCat.name : 'General';

    if (store.habits) {
      store.habits.forEach(h => {
        if (h.category === catToDelete.name) h.category = targetCatName;
      });
    }

    store.categories.splice(idx, 1);
    writeLocalData(store);

    res.json({ success: true, message: `Category deleted. Habits reassigned to ${targetCatName}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
