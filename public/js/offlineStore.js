// Committed Local Data Store & Offline Auto-Sync Engine
const OfflineStore = {
  KEYS: {
    HABITS: 'committed_offline_habits',
    CATEGORIES: 'committed_offline_categories',
    PROGRESSION: 'committed_offline_progression',
    ANALYTICS: 'committed_offline_analytics',
    SYNC_QUEUE: 'committed_sync_queue'
  },

  isSyncing: false,

  // --- Storage Accessors ---
  getHabits() {
    try {
      const data = localStorage.getItem(this.KEYS.HABITS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHabits(habits) {
    try {
      localStorage.setItem(this.KEYS.HABITS, JSON.stringify(habits || []));
    } catch (e) {
      console.warn('[OfflineStore] Failed to save habits:', e);
    }
  },

  getHabitById(id) {
    const habits = this.getHabits();
    return habits.find(h => String(h.id) === String(id)) || null;
  },

  getCategories() {
    try {
      const data = localStorage.getItem(this.KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCategories(cats) {
    try {
      localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(cats || []));
    } catch (e) {
      console.warn('[OfflineStore] Failed to save categories:', e);
    }
  },

  getProgression() {
    try {
      const data = localStorage.getItem(this.KEYS.PROGRESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveProgression(prog) {
    try {
      localStorage.setItem(this.KEYS.PROGRESSION, JSON.stringify(prog));
    } catch (e) {
      console.warn('[OfflineStore] Failed to save progression:', e);
    }
  },

  getAnalytics() {
    try {
      const data = localStorage.getItem(this.KEYS.ANALYTICS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveAnalytics(data) {
    try {
      localStorage.setItem(this.KEYS.ANALYTICS, JSON.stringify(data));
    } catch (e) {
      console.warn('[OfflineStore] Failed to save analytics:', e);
    }
  },

  // --- Sync Queue Management ---
  getSyncQueue() {
    try {
      const data = localStorage.getItem(this.KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSyncQueue(queue) {
    try {
      localStorage.setItem(this.KEYS.SYNC_QUEUE, JSON.stringify(queue || []));
      this.updateOfflineBadge();
    } catch (e) {
      console.warn('[OfflineStore] Failed to save sync queue:', e);
    }
  },

  enqueue(action) {
    const queue = this.getSyncQueue();
    queue.push({
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      ...action
    });
    this.saveSyncQueue(queue);
  },

  updateOfflineBadge() {
    const queue = this.getSyncQueue();
    if (window.NetworkMonitor && typeof NetworkMonitor.updateSyncBadge === 'function') {
      NetworkMonitor.updateSyncBadge(queue.length);
    }
  },

  // --- Optimistic Mutations ---

  toggleLog(habitId, dateStr) {
    const habits = this.getHabits();
    const habit = habits.find(h => String(h.id) === String(habitId));

    if (!habit) {
      throw new Error(`Habit ${habitId} not found in offline cache`);
    }

    const logsSet = new Set(habit.logs || []);
    let wasAdded = false;

    if (logsSet.has(dateStr)) {
      logsSet.delete(dateStr);
    } else {
      logsSet.add(dateStr);
      wasAdded = true;
    }

    habit.logs = Array.from(logsSet);

    // Recalculate stats using client utility if available
    if (window.Utils && typeof Utils.calculateHabitStats === 'function') {
      const stats = Utils.calculateHabitStats(logsSet, habit.frequency_days || 7);
      Object.assign(habit, stats);
    }

    this.saveHabits(habits);

    // Update progression XP locally if completed
    let prog = this.getProgression();
    if (prog) {
      if (wasAdded) {
        prog.currentLevelXP = (prog.currentLevelXP || 0) + 10;
        prog.totalXP = (prog.totalXP || 0) + 10;
        if (prog.nextLevelTargetXP && prog.currentLevelXP >= prog.nextLevelTargetXP) {
          prog.level = (prog.level || 1) + 1;
          prog.currentLevelXP = prog.currentLevelXP - prog.nextLevelTargetXP;
          prog.nextLevelTargetXP = Math.round(prog.nextLevelTargetXP * 1.5);
        }
        prog.progressPercent = Math.min(100, Math.round(((prog.currentLevelXP || 0) / (prog.nextLevelTargetXP || 100)) * 100));
        this.saveProgression(prog);
      }
    }

    // Enqueue server sync action
    this.enqueue({
      type: 'toggle_log',
      habitId,
      dateStr
    });

    window.dispatchEvent(new CustomEvent('committed:offline-change', {
      detail: { type: 'toggle_log', habitId, dateStr, wasAdded }
    }));

    return {
      success: true,
      habit,
      offline: true,
      wasAdded
    };
  },

  createHabit(habitData) {
    const habits = this.getHabits();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newHabit = {
      id: tempId,
      title: habitData.title || 'New Habit',
      description: habitData.description || '',
      category: habitData.category || 'General',
      color: habitData.color || '#10B981',
      icon: habitData.icon || 'zap',
      frequency_days: Number(habitData.frequency_days) || 7,
      grid_days: Number(habitData.grid_days) || 60,
      tile_shape: habitData.tile_shape || 'tile-rounded',
      is_archived: false,
      order_index: habits.length,
      logs: [],
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      completionRate: 0,
      thisWeekCompleted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    habits.unshift(newHabit);
    this.saveHabits(habits);

    this.enqueue({
      type: 'create_habit',
      tempId,
      payload: habitData
    });

    window.dispatchEvent(new CustomEvent('committed:offline-change', {
      detail: { type: 'create_habit', habit: newHabit }
    }));

    return {
      success: true,
      habit: newHabit,
      offline: true
    };
  },

  updateHabit(habitId, updates) {
    const habits = this.getHabits();
    const habit = habits.find(h => String(h.id) === String(habitId));

    if (!habit) {
      throw new Error(`Habit ${habitId} not found in offline cache`);
    }

    Object.assign(habit, updates, { updated_at: new Date().toISOString() });
    this.saveHabits(habits);

    this.enqueue({
      type: 'update_habit',
      habitId,
      payload: updates
    });

    window.dispatchEvent(new CustomEvent('committed:offline-change', {
      detail: { type: 'update_habit', habit }
    }));

    return {
      success: true,
      habit,
      offline: true
    };
  },

  deleteHabit(habitId) {
    let habits = this.getHabits();
    habits = habits.filter(h => String(h.id) !== String(habitId));
    this.saveHabits(habits);

    this.enqueue({
      type: 'delete_habit',
      habitId
    });

    window.dispatchEvent(new CustomEvent('committed:offline-change', {
      detail: { type: 'delete_habit', habitId }
    }));

    return {
      success: true,
      offline: true
    };
  },

  createCategory(catData) {
    const cats = this.getCategories();
    const tempId = `temp_cat_${Date.now()}`;
    const newCat = {
      id: tempId,
      name: catData.name,
      color: catData.color || '#10B981',
      icon: catData.icon || 'tag'
    };
    cats.push(newCat);
    this.saveCategories(cats);

    this.enqueue({
      type: 'create_category',
      tempId,
      payload: catData
    });

    return { success: true, category: newCat, offline: true };
  },

  updateCategory(catId, updates) {
    const cats = this.getCategories();
    const cat = cats.find(c => String(c.id) === String(catId));
    if (cat) {
      Object.assign(cat, updates);
      this.saveCategories(cats);
    }
    this.enqueue({
      type: 'update_category',
      catId,
      payload: updates
    });
    return { success: true, category: cat, offline: true };
  },

  deleteCategory(catId) {
    let cats = this.getCategories();
    cats = cats.filter(c => String(c.id) !== String(catId));
    this.saveCategories(cats);

    this.enqueue({
      type: 'delete_category',
      catId
    });
    return { success: true, offline: true };
  },

  // --- Background Auto-Sync Engine ---

  async processSyncQueue() {
    if (!navigator.onLine || this.isSyncing) return;

    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`[OfflineStore] Syncing ${queue.length} offline mutations with server...`);

    if (window.NetworkMonitor && typeof NetworkMonitor.showSyncing === 'function') {
      NetworkMonitor.showSyncing(queue.length);
    }

    const tempIdMap = new Map();
    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.type === 'toggle_log') {
          const habitId = tempIdMap.get(item.habitId) || item.habitId;
          const res = await fetch('/api/logs/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habit_id: habitId, date: item.dateStr })
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else if (item.type === 'create_habit') {
          const res = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const data = await res.json();
          if (data && data.habit && data.habit.id) {
            tempIdMap.set(item.tempId, data.habit.id);
          }
        } else if (item.type === 'update_habit') {
          const habitId = tempIdMap.get(item.habitId) || item.habitId;
          const res = await fetch(`/api/habits/${habitId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else if (item.type === 'delete_habit') {
          const habitId = tempIdMap.get(item.habitId) || item.habitId;
          const res = await fetch(`/api/habits/${habitId}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else if (item.type === 'create_category') {
          const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else if (item.type === 'update_category') {
          const res = await fetch(`/api/categories/${item.catId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else if (item.type === 'delete_category') {
          const res = await fetch(`/api/categories/${item.catId}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
        }
      } catch (err) {
        console.error(`[OfflineStore] Failed to sync item ${item.id}:`, err);
        remainingQueue.push(item);
      }
    }

    this.saveSyncQueue(remainingQueue);
    this.isSyncing = false;

    // If all synced, refresh caches from server & notify UI
    if (remainingQueue.length === 0) {
      console.log('[OfflineStore] All offline actions synced successfully!');
      try {
        const [hRes, pRes] = await Promise.all([
          fetch('/api/habits').then(r => r.json()).catch(() => null),
          fetch('/api/progression').then(r => r.json()).catch(() => null)
        ]);
        if (hRes && hRes.success && hRes.habits) this.saveHabits(hRes.habits);
        if (pRes && pRes.success) this.saveProgression(pRes);
      } catch (err) {
        console.warn('[OfflineStore] Error refreshing caches post-sync:', err);
      }

      window.dispatchEvent(new CustomEvent('committed:sync-complete'));

      if (window.NetworkMonitor && typeof NetworkMonitor.showOnlineRecovered === 'function') {
        NetworkMonitor.showOnlineRecovered('All offline changes synced with Supabase!');
      }
    }
  }
};

// Auto-trigger sync when network reconnects
window.addEventListener('online', () => {
  OfflineStore.processSyncQueue();
});
