// Committed Intelligent REST API Client with SWR Caching & Network Intelligence
const API = {
  baseUrl: '/api',
  _memoryCache: new Map(),

  async _request(url, options = {}, cacheKey = null) {
    let slowTimer = null;
    
    // Trigger slow-network warning if request takes longer than 2.8s
    if (window.NetworkMonitor) {
      slowTimer = setTimeout(() => {
        NetworkMonitor.showSlowNetwork('Connection is slow. Please move to an area with stronger network reception for instant syncing.');
      }, 2800);
    }

    try {
      const res = await fetch(url, options);
      if (slowTimer) clearTimeout(slowTimer);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Cache successful GET responses in memory & sessionStorage
      if (cacheKey && data && data.success) {
        this._memoryCache.set(cacheKey, data);
        try {
          sessionStorage.setItem(`committed_cache_${cacheKey}`, JSON.stringify(data));
        } catch (e) {}
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

      // If offline/network failed, serve cached data gracefully
      if (cacheKey) {
        if (this._memoryCache.has(cacheKey)) {
          console.warn(`[API] Serving in-memory cached ${cacheKey} data.`);
          return this._memoryCache.get(cacheKey);
        }
        try {
          const cached = sessionStorage.getItem(`committed_cache_${cacheKey}`);
          if (cached) {
            console.warn(`[API] Serving sessionStorage cached ${cacheKey} data.`);
            const parsed = JSON.parse(cached);
            this._memoryCache.set(cacheKey, parsed);
            return parsed;
          }
        } catch (e) {}
      }

      throw err;
    }
  },

  _invalidateCache(keys = []) {
    if (keys.length === 0) {
      this._memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('committed_cache_')) sessionStorage.removeItem(k);
        });
      } catch (e) {}
    } else {
      keys.forEach(k => {
        this._memoryCache.delete(k);
        try {
          sessionStorage.removeItem(`committed_cache_${k}`);
        } catch (e) {}
      });
    }
  },

  async getHabits(category = 'All') {
    const url = category && category !== 'All' 
      ? `${this.baseUrl}/habits?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/habits`;
    return this._request(url, {}, `habits_${category}`);
  },

  async getHabitById(id) {
    return this._request(`${this.baseUrl}/habits/${id}`, {}, `habit_${id}`);
  },

  async createHabit(habitData) {
    this._invalidateCache();
    return this._request(`${this.baseUrl}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habitData)
    });
  },

  async updateHabit(id, updates) {
    this._invalidateCache();
    return this._request(`${this.baseUrl}/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteHabit(id) {
    this._invalidateCache();
    return this._request(`${this.baseUrl}/habits/${id}`, {
      method: 'DELETE'
    });
  },

  async getCategories() {
    return this._request(`${this.baseUrl}/categories`, {}, 'categories');
  },

  async createCategory(categoryData) {
    this._invalidateCache(['categories']);
    return this._request(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
  },

  async updateCategory(id, updates) {
    this._invalidateCache(['categories']);
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteCategory(id) {
    this._invalidateCache(['categories']);
    return this._request(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE'
    });
  },

  async toggleLog(habitId, date) {
    this._invalidateCache();
    return this._request(`${this.baseUrl}/logs/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, date })
    });
  },

  async getProgression() {
    return this._request(`${this.baseUrl}/progression`, {}, 'progression');
  },

  async getXPHistory() {
    return this._request(`${this.baseUrl}/progression/history`, {}, 'xp_history');
  },

  async getAchievements() {
    return this._request(`${this.baseUrl}/progression/achievements`, {}, 'achievements');
  },

  async getAnalytics() {
    return this._request(`${this.baseUrl}/analytics`, {}, 'analytics');
  },

  async exportBackup() {
    window.location.href = `${this.baseUrl}/backup/export`;
  },

  async importBackup(backupData) {
    this._invalidateCache();
    return this._request(`${this.baseUrl}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
  }
};
