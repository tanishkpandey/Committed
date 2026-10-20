// Committed Intelligent REST API Client (Strict Online-Only & Supabase Direct)
const API = {
  baseUrl: '/api',

  async _request(url, options = {}) {
    // 1. Strict online connectivity check before firing request
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (typeof window !== 'undefined' && window.OnlineGuard) {
        window.OnlineGuard.show('You are currently offline. An active internet connection is required.');
      }
      throw new Error('Committed operates in strict online-only mode. Internet connection required.');
    }

    if (typeof window !== 'undefined' && window.OnlineGuard && !window.OnlineGuard.isOnline) {
      window.OnlineGuard.show('Cloud connection is inactive. Please reconnect to continue.');
      throw new Error('Cloud connection is inactive. Internet connection required.');
    }

    try {
      const res = await fetch(url, options);

      // If session expired or unauthorized, redirect immediately to landing page
      if (res.status === 401) {
        window.location.href = '/landingpage';
        return { success: false, error: 'Unauthorized' };
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = (data && (data.error || data.message)) || `Server returned status ${res.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error('[API Error]', err);

      // 2. Intercept network / offline dropouts and display the online guard
      if (typeof window !== 'undefined' && window.OnlineGuard) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          window.OnlineGuard.show();
        } else if (
          err.name === 'TypeError' ||
          (err.message && (
            err.message.toLowerCase().includes('failed to fetch') ||
            err.message.toLowerCase().includes('network') ||
            err.message.toLowerCase().includes('aborted')
          ))
        ) {
          window.OnlineGuard.handleNetworkFailure(err);
        }
      }

      throw err;
    }
  },

  async getHabits(category = 'All') {
    const url = category && category !== 'All' 
      ? `${this.baseUrl}/habits?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/habits`;
    return this._request(url);
  },

  async getHabitById(id) {
    return this._request(`${this.baseUrl}/habits/${id}`);
  },

  async createHabit(habitData) {
    return this._request(`${this.baseUrl}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habitData)
    });
  },

  async updateHabit(id, updates) {
    return this._request(`${this.baseUrl}/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteHabit(id) {
    return this._request(`${this.baseUrl}/habits/${id}`, {
      method: 'DELETE'
    });
  },

  async getCategories() {
    return this._request(`${this.baseUrl}/categories`);
  },

  async createCategory(categoryData) {
    return this._request(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
  },

  async updateCategory(id, updates) {
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteCategory(id) {
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE'
    });
  },

  async toggleLog(habitId, date) {
    return this._request(`${this.baseUrl}/logs/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, date })
    });
  },

  async getProgression() {
    return this._request(`${this.baseUrl}/progression`);
  },

  async getXPHistory() {
    return this._request(`${this.baseUrl}/progression/history`);
  },

  async getAchievements() {
    return this._request(`${this.baseUrl}/progression/achievements`);
  },

  async getAnalytics() {
    return this._request(`${this.baseUrl}/analytics`);
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
