// Committed Intelligent REST API Client with OfflineStore Integration
const API = {
  baseUrl: '/api',

  async _request(url, options = {}) {
    let slowTimer = null;
    
    if (window.NetworkMonitor) {
      slowTimer = setTimeout(() => {
        NetworkMonitor.showSlowNetwork('Connection is slow. Syncing with Supabase...');
      }, 3500);
    }

    try {
      const res = await fetch(url, options);
      if (slowTimer) clearTimeout(slowTimer);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = (data && (data.error || data.message)) || `Server returned status ${res.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      if (slowTimer) clearTimeout(slowTimer);

      const isNetworkError = !navigator.onLine || 
        err.message.includes('Failed to fetch') || 
        err.message.includes('NetworkError') ||
        err.name === 'TypeError';

      if (isNetworkError && window.NetworkMonitor) {
        NetworkMonitor.showOffline();
      }

      throw err;
    }
  },

  async getHabits(category = 'All') {
    const url = category && category !== 'All' 
      ? `${this.baseUrl}/habits?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/habits`;

    if (!navigator.onLine) {
      const cached = (window.OfflineStore && OfflineStore.getHabits()) || [];
      const filtered = category && category !== 'All' 
        ? cached.filter(h => h.category === category)
        : cached;
      return { success: true, habits: filtered, offline: true };
    }

    try {
      const res = await this._request(url);
      if (res && res.success && res.habits && window.OfflineStore) {
        if (!category || category === 'All') {
          OfflineStore.saveHabits(res.habits);
        }
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        console.warn('[API] getHabits network failed, serving from OfflineStore');
        const cached = OfflineStore.getHabits();
        const filtered = category && category !== 'All' 
          ? cached.filter(h => h.category === category)
          : cached;
        return { success: true, habits: filtered, offline: true };
      }
      throw err;
    }
  },

  async getHabitById(id) {
    if (!navigator.onLine && window.OfflineStore) {
      const habit = OfflineStore.getHabitById(id);
      if (habit) return { success: true, habit, offline: true };
    }

    try {
      const res = await this._request(`${this.baseUrl}/habits/${id}`);
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        const habit = OfflineStore.getHabitById(id);
        if (habit) return { success: true, habit, offline: true };
      }
      throw err;
    }
  },

  async createHabit(habitData) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.createHabit(habitData);
    }

    try {
      const res = await this._request(`${this.baseUrl}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData)
      });
      if (res && res.success && res.habit && window.OfflineStore) {
        const habits = OfflineStore.getHabits();
        habits.unshift(res.habit);
        OfflineStore.saveHabits(habits);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        return OfflineStore.createHabit(habitData);
      }
      throw err;
    }
  },

  async updateHabit(id, updates) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.updateHabit(id, updates);
    }

    try {
      const res = await this._request(`${this.baseUrl}/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res && res.success && res.habit && window.OfflineStore) {
        OfflineStore.updateHabit(id, res.habit);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        return OfflineStore.updateHabit(id, updates);
      }
      throw err;
    }
  },

  async deleteHabit(id) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.deleteHabit(id);
    }

    try {
      const res = await this._request(`${this.baseUrl}/habits/${id}`, {
        method: 'DELETE'
      });
      if (res && res.success && window.OfflineStore) {
        OfflineStore.deleteHabit(id);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        return OfflineStore.deleteHabit(id);
      }
      throw err;
    }
  },

  async getCategories() {
    if (!navigator.onLine && window.OfflineStore) {
      return { success: true, categories: OfflineStore.getCategories(), offline: true };
    }

    try {
      const res = await this._request(`${this.baseUrl}/categories`);
      if (res && res.success && res.categories && window.OfflineStore) {
        OfflineStore.saveCategories(res.categories);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        return { success: true, categories: OfflineStore.getCategories(), offline: true };
      }
      throw err;
    }
  },

  async createCategory(categoryData) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.createCategory(categoryData);
    }
    return this._request(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
  },

  async updateCategory(id, updates) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.updateCategory(id, updates);
    }
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteCategory(id) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.deleteCategory(id);
    }
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE'
    });
  },

  async toggleLog(habitId, date) {
    if (!navigator.onLine && window.OfflineStore) {
      return OfflineStore.toggleLog(habitId, date);
    }

    try {
      const res = await this._request(`${this.baseUrl}/logs/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, date })
      });
      if (res && res.success && res.habit && window.OfflineStore) {
        const habits = OfflineStore.getHabits();
        const idx = habits.findIndex(h => String(h.id) === String(habitId));
        if (idx !== -1) {
          habits[idx] = Object.assign(habits[idx], res.habit);
          OfflineStore.saveHabits(habits);
        }
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        return OfflineStore.toggleLog(habitId, date);
      }
      throw err;
    }
  },

  async getProgression() {
    if (!navigator.onLine && window.OfflineStore) {
      const cached = OfflineStore.getProgression();
      if (cached) return { success: true, ...cached, offline: true };
    }

    try {
      const res = await this._request(`${this.baseUrl}/progression`);
      if (res && res.success && window.OfflineStore) {
        OfflineStore.saveProgression(res);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        const cached = OfflineStore.getProgression();
        if (cached) return { success: true, ...cached, offline: true };
      }
      throw err;
    }
  },

  async getXPHistory() {
    try {
      return await this._request(`${this.baseUrl}/progression/history`);
    } catch (err) {
      return { success: true, history: [], offline: true };
    }
  },

  async getAchievements() {
    try {
      return await this._request(`${this.baseUrl}/progression/achievements`);
    } catch (err) {
      return { success: true, achievements: [], offline: true };
    }
  },

  async getAnalytics() {
    if (!navigator.onLine && window.OfflineStore) {
      const cached = OfflineStore.getAnalytics();
      if (cached) return { success: true, analytics: cached, offline: true };
    }

    try {
      const res = await this._request(`${this.baseUrl}/analytics`);
      if (res && res.success && res.analytics && window.OfflineStore) {
        OfflineStore.saveAnalytics(res.analytics);
      }
      return res;
    } catch (err) {
      if (window.OfflineStore) {
        const cached = OfflineStore.getAnalytics();
        if (cached) return { success: true, analytics: cached, offline: true };
      }
      throw err;
    }
  },

  async exportBackup() {
    window.location.href = `${this.baseUrl}/backup/export`;
  },

  async importBackup(backupData) {
    return this._request(`${this.baseUrl}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
  }
};
