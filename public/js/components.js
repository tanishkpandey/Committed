/**
 * Committed UI Components System
 * Lightweight, accessible, high-performance reusable UI components.
 * Follows modern mobile-first frontend patterns, event delegation, and WCAG AA guidelines.
 */

(function (window) {
  'use strict';

  const UI = {
    /**
     * Escape HTML helper to prevent XSS in template interpolation
     */
    escape(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * Reusable Bottom Navigation Component
     * @param {string} activeTab - 'habits' | 'progress' | 'today' | 'analytics' | 'settings'
     */
    renderBottomNav(activeTab = 'today') {
      const items = [
        {
          href: '/habits.html',
          id: 'habits',
          label: 'Habits',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'
        },
        {
          href: '/progress.html',
          id: 'progress',
          label: 'Progress',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
        },
        {
          href: '/',
          id: 'today',
          label: 'Today',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>'
        },
        {
          href: '/analytics.html',
          id: 'analytics',
          label: 'Insights',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>'
        },
        {
          href: '/settings.html',
          id: 'settings',
          label: 'Settings',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
        }
      ];

      return `
        <nav class="bottom-nav" aria-label="Main Navigation">
          ${items.map(it => {
        const isActive = it.id === activeTab || (activeTab === 'home' && it.id === 'habits') || (activeTab === 'detail' && it.id === 'habits');
        return `
              <a href="${it.href}" class="nav-item ${isActive ? 'active' : ''}" aria-current="${isActive ? 'page' : 'false'}">
                ${it.svg}
                <span>${it.label}</span>
              </a>
            `;
      }).join('')}
        </nav>
      `;
    },

    /**
     * Reusable Habit Card Component
     * Generates a fully responsive habit card with header, interactive grid, and footer stats.
     */
    renderHabitCard(habit, options = {}) {
      const U = (typeof window !== 'undefined' && window.Utils) || (typeof Utils !== 'undefined' ? Utils : null);
      const tileShape = options.tileShape || (typeof localStorage !== 'undefined' && localStorage.getItem('habitkit_tile_shape')) || 'tile-rounded';
      const todayStr = U && U.getTodayStr ? U.getTodayStr() : new Date().toISOString().slice(0, 10);
      const isCompletedToday = habit.logs && habit.logs.includes(todayStr);

      const gridDays = (U && U.generateGridDays) ? U.generateGridDays(habit.grid_days || 60) : [];
      const logsSet = new Set(habit.logs || []);

      const stats = (U && U.calculateHabitStats) ? U.calculateHabitStats(logsSet, habit.frequency_days || 7) : {
        currentStreak: 0,
        longestStreak: 0,
        streakUnit: 'd',
        completionRate: 0,
        totalCompletions: 0,
        thisWeekCompleted: 0,
        isTargetMetThisWeek: false
      };

      habit.currentStreak = stats.currentStreak;
      habit.longestStreak = stats.longestStreak;
      habit.streakUnit = stats.streakUnit;
      habit.completionRate = stats.completionRate;
      habit.totalCompletions = stats.totalCompletions;
      habit.thisWeekCompleted = stats.thisWeekCompleted;
      habit.isTargetMetThisWeek = stats.isTargetMetThisWeek;

      const tilesHtml = gridDays.map(day => {
        if (day.isFuture) {
          return `<div class="grid-tile ${tileShape}" style="opacity: 0.12; pointer-events: none;" aria-hidden="true"></div>`;
        }

        const isCompleted = logsSet.has(day.date);
        const bgStyle = isCompleted ? `background-color: ${habit.color}; --tile-glow-color: ${habit.color};` : '';
        const completedClass = isCompleted ? 'completed' : '';
        const todayClass = day.isToday ? 'is-today' : '';

        return `
          <div 
            class="grid-tile ${tileShape} ${completedClass} ${todayClass}"
            style="${bgStyle}"
            data-date="${day.date}"
            data-habit-id="${habit.id}"
            onclick="handleTileClick('${habit.id}', '${day.date}', this, event)"
            tabindex="0"
            role="button"
            aria-label="${day.formatted}: ${isCompleted ? 'Completed' : 'Not completed'}"
          >
            <div class="tile-tooltip">${day.formatted} ${isCompleted ? '✓ Done' : '○ Not logged'}</div>
          </div>
        `;
      }).join('');

      return `
        <article class="habit-card animate-fade-in" id="card-${habit.id}" data-habit-id="${habit.id}">
          <header class="habit-header">
            <div 
              class="habit-info-group" 
              onclick="window.location.href='/habit-detail.html?id=${habit.id}'" 
              style="cursor: pointer;"
              role="link"
              tabindex="0"
              aria-label="View details for ${this.escape(habit.title)}"
            >
              <div class="habit-icon-badge" style="background-color: ${habit.color};">
                <i data-lucide="${habit.icon || 'zap'}" style="width: 15px; height: 15px;"></i>
              </div>
              <div class="habit-text">
                <a href="/habit-detail.html?id=${habit.id}" class="habit-title" onclick="event.stopPropagation()">${this.escape(habit.title)}</a>
                <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem;">
                  <span class="habit-desc">${this.escape(habit.description || habit.category || 'Daily')}</span>
                  ${habit.frequency_days < 7 ? `
                    <span class="frequency-quota-badge ${habit.isTargetMetThisWeek ? 'met' : ''}">
                      ${habit.isTargetMetThisWeek ? '<i data-lucide="check" style="width: 11px; height: 11px;"></i>' : ''}
                      <span>${habit.thisWeekCompleted}/${habit.frequency_days} this week</span>
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>

            <div class="habit-meta-actions">
              <div class="streak-badge ${habit.currentStreak > 0 ? 'active-fire' : ''}" id="streak-${habit.id}">
                <i data-lucide="flame" style="width: 14px; height: 14px;"></i>
                <span class="streak-val">${habit.currentStreak || 0}${habit.streakUnit || 'd'}</span>
              </div>
            </div>
          </header>

          <div class="grid-wrapper">
            <div class="contribution-grid" id="grid-${habit.id}">
              ${tilesHtml}
            </div>
          </div>

          <footer class="habit-card-footer">
            <div class="habit-footer-stats">
              <div class="habit-footer-stat">
                <i data-lucide="flame" style="width: 12px; height: 12px; color: #f59e0b;"></i>
                <span class="habit-footer-label">Best:</span>
                <span class="habit-footer-val" id="best-${habit.id}">${habit.longestStreak || 0}${habit.streakUnit || 'd'}</span>
              </div>
              <div class="habit-footer-stat">
                <i data-lucide="activity" style="width: 12px; height: 12px; color: #10b981;"></i>
                <span class="habit-footer-label">Month:</span>
                <span class="habit-footer-val" id="rate-${habit.id}">${habit.completionRate || 0}%</span>
              </div>
            </div>
            <a href="/habit-detail.html?id=${habit.id}" class="habit-details-link" title="View Full Statistics & Breakdown">
              <span>Details</span> <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
            </a>
          </footer>
        </article>
      `;
    },

    /**
     * Reusable Empty State Component
     */
    renderEmptyState({
      icon = 'sparkles',
      title = 'No habits yet',
      description = 'Create your first habit to start building your streak grid!',
      buttonText = 'Create Habit',
      buttonAction = 'openHabitModal()'
    } = {}) {
      return `
        <div class="empty-state-card animate-fade-in" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 1px solid var(--border-subtle);">
            <i data-lucide="${icon}" style="width: 28px; height: 28px; color: var(--accent-primary);"></i>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">${this.escape(title)}</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem; max-width: 320px; margin-left: auto; margin-right: auto;">${this.escape(description)}</p>
          ${buttonText ? `
            <button class="btn btn-primary" onclick="${buttonAction}">
              <span class="btn-icon-bubble"><i data-lucide="plus" style="width: 14px; height: 14px;"></i></span>
              <span>${this.escape(buttonText)}</span>
            </button>
          ` : ''}
        </div>
      `;
    },

    /**
     * Reusable Skeleton Shimmer Cards
     */
    renderSkeletonCards(count = 2) {
      let cards = '';
      for (let i = 0; i < count; i++) {
        cards += `
          <div class="skeleton-habit-card animate-fade-in">
            <div class="skeleton-habit-header">
              <div class="skeleton-habit-header-left">
                <div class="skeleton-shimmer skeleton-circle" style="width: 36px; height: 36px;"></div>
                <div>
                  <div class="skeleton-shimmer" style="width: 120px; height: 15px; margin-bottom: 6px;"></div>
                  <div class="skeleton-shimmer" style="width: 75px; height: 11px;"></div>
                </div>
              </div>
              <div class="skeleton-shimmer skeleton-pill" style="width: 48px; height: 26px;"></div>
            </div>
            <div class="skeleton-grid-box">
              ${Array(18).fill('<div class="skeleton-shimmer skeleton-grid-square"></div>').join('')}
            </div>
            <div class="skeleton-habit-footer">
              <div class="skeleton-shimmer" style="width: 65px; height: 13px;"></div>
              <div class="skeleton-shimmer" style="width: 55px; height: 13px;"></div>
              <div class="skeleton-shimmer" style="width: 50px; height: 13px;"></div>
            </div>
          </div>
        `;
      }
      return cards;
    },

    /**
     * Reusable Metric / Stat Card
     */
    renderStatCard({
      icon = 'activity',
      label = '',
      value = '0',
      subtext = '',
      color = '#10b981',
      trend = null
    } = {}) {
      return `
        <div class="ref-overview-card animate-fade-in">
          <div class="ref-card-icon-badge" style="background: ${color}20; color: ${color};">
            <i data-lucide="${icon}" style="width: 17px; height: 17px;"></i>
          </div>
          <div class="ref-card-val">${this.escape(value)}</div>
          <div class="ref-card-label">${this.escape(label)}</div>
          ${trend ? `
            <div class="ref-card-trend up">
              <i data-lucide="trending-up" style="width: 12px; height: 12px;"></i>
              <span>${this.escape(trend)}</span>
            </div>
          ` : subtext ? `
            <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;">${this.escape(subtext)}</div>
          ` : ''}
        </div>
      `;
    },

    /**
     * Reusable Filter Chips Bar
     */
    renderFilterChips(categories = [], activeCategory = 'All') {
      const items = ['All', ...categories];
      return `
        <div class="scroll-fade-wrapper">
          <div class="filter-scroll" role="tablist" aria-label="Filter habits by category">
            ${items.map(cat => {
        const isActive = cat.toLowerCase() === activeCategory.toLowerCase();
        return `
                <button 
                  class="chip ${isActive ? 'active' : ''}" 
                  data-category="${this.escape(cat)}"
                  role="tab"
                  aria-selected="${isActive ? 'true' : 'false'}"
                >${this.escape(cat)}</button>
              `;
      }).join('')}
          </div>
        </div>
      `;
    },

    /**
     * Modal Scroll Locking helpers to prevent background page scroll while sheets are open
     */
    lockBodyScroll() {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    },

    unlockBodyScroll() {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    },

    /**
     * Mount event delegation for contribution grid tile clicks and quick toggles
     * @param {HTMLElement} container
     * @param {Function} onTileClick - (habitId, date, tileElem, event)
     * @param {Function} onQuickToggle - (habitId, checkBtn, event)
     */
    bindGridEvents(container, onTileClick, onQuickToggle) {
      if (!container) return;

      container.addEventListener('click', (event) => {
        // 1. Quick check button toggle
        const checkBtn = event.target.closest('[data-action="quick-toggle"]');
        if (checkBtn) {
          event.stopPropagation();
          const habitId = checkBtn.dataset.habitId;
          if (onQuickToggle && habitId) {
            onQuickToggle(habitId, checkBtn, event);
          }
          return;
        }

        // 2. Grid tile click
        const tile = event.target.closest('.grid-tile');
        if (tile && tile.dataset.habitId && tile.dataset.date) {
          event.stopPropagation();
          const habitId = tile.dataset.habitId;
          const date = tile.dataset.date;
          if (onTileClick) {
            onTileClick(habitId, date, tile, event);
          }
          return;
        }
      });
    }
  };

  window.CommittedUI = UI;
  window.UI = UI;
})(window);
