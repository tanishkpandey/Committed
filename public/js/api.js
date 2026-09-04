// Committed Intelligent REST API Client (Supabase Direct)
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
