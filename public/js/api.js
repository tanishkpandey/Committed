// Committed REST API Client
const API = {
  baseUrl: '/api',

  async getHabits(category = 'All') {
    const url = category && category !== 'All' 
      ? `${this.baseUrl}/habits?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/habits`;
    const res = await fetch(url);
    return res.json();
  },

  async getHabitById(id) {
    const res = await fetch(`${this.baseUrl}/habits/${id}`);
    return res.json();
  },

  async createHabit(habitData) {
    const res = await fetch(`${this.baseUrl}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habitData)
    });
    return res.json();
  },

  async updateHabit(id, updates) {
    const res = await fetch(`${this.baseUrl}/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteHabit(id) {
    const res = await fetch(`${this.baseUrl}/habits/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getCategories() {
    const res = await fetch(`${this.baseUrl}/categories`);
    return res.json();
  },

  async createCategory(categoryData) {
    const res = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
    return res.json();
  },

  async updateCategory(id, updates) {
    const res = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async toggleLog(habitId, date) {
    const res = await fetch(`${this.baseUrl}/logs/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, date })
    });
    return res.json();
  },

  async getProgression() {
    const res = await fetch(`${this.baseUrl}/progression`);
    return res.json();
  },

  async getXPHistory() {
    const res = await fetch(`${this.baseUrl}/progression/history`);
    return res.json();
  },

  async getAchievements() {
    const res = await fetch(`${this.baseUrl}/progression/achievements`);
    return res.json();
  },

  async getAnalytics() {
    const res = await fetch(`${this.baseUrl}/analytics`);
    return res.json();
  },

  async exportBackup() {
    window.location.href = `${this.baseUrl}/backup/export`;
  },

  async importBackup(backupData) {
    const res = await fetch(`${this.baseUrl}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
    return res.json();
  }
};
