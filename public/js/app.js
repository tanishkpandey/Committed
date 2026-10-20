// Committed Dashboard Controller with Reactive Progress Widget

let currentCategory = 'All';
let habitsData = [];
let userProgressionData = null;
let knownUnlockedBadges = new Set();

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderDashboardGreeting();
  loadDashboard();
  setupFilterChips();
  setupEventListeners();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme') || localStorage.getItem('habitkit_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (window.Utils && Utils.syncMobileThemeColor) {
    Utils.syncMobileThemeColor(saved);
  }
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', saved === 'dark' ? 'moon' : 'sun');
  }
}

async function loadDashboard() {
  await Promise.all([loadHabits(), loadProgressionWidget()]);
}

async function loadProgressionWidget() {
  try {
    const res = await API.getProgression();
    if (!res.success) return;
    userProgressionData = res;
    if (res.achievements && Array.isArray(res.achievements)) {
      knownUnlockedBadges = new Set(res.achievements.filter(a => a.unlocked).map(a => a.id));
    }
    updateWidgetUI(res);
  } catch (err) {
    console.error('Error loading progression widget:', err);
  }
}

function updateWidgetUI(data) {
  const levelText = document.getElementById('widgetLevelText');
  const xpCounts = document.getElementById('widgetXpCounts');
  const fill = document.getElementById('widgetFill');
  const streakText = document.getElementById('widgetStreakText');

  if (levelText) levelText.textContent = `LEVEL ${data.level}`;
  if (xpCounts) xpCounts.textContent = `${(data.currentLevelXP || 0).toLocaleString()} / ${(data.nextLevelTargetXP || 100).toLocaleString()} XP`;
  if (fill) fill.style.width = `${data.progressPercent}%`;
  if (streakText) streakText.textContent = `${data.lifetimeStats.perfectDaysStreak || 0} Perfect Day Streak`;
  renderDashboardGreeting(data.lifetimeStats ? data.lifetimeStats.longestStreak || 0 : 0);
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

async function loadHabits() {
  const container = document.getElementById('habitsContainer');
  const skeleton = document.getElementById('loadingSkeleton');
  if (skeleton) skeleton.style.display = 'block';

  try {
    const res = await API.getHabits(currentCategory);
    if (skeleton) skeleton.style.display = 'none';

    if (!res.success) {
      throw new Error(res.error || 'Failed to fetch habits from database');
    }

    if (!res.habits || res.habits.length === 0) {
      if (window.UI && UI.renderEmptyState) {
        container.innerHTML = UI.renderEmptyState({
          icon: 'sparkles',
          title: 'No habits found',
          description: 'Create your first habit to start building your streak grid in Supabase!',
          buttonText: 'Create Habit',
          buttonAction: 'openHabitModal()'
        });
      }
      lucide.createIcons();
      return;
    }

    habitsData = res.habits;
    renderHabitCards(habitsData);
  } catch (err) {
    if (skeleton) skeleton.style.display = 'none';
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid rgba(244, 63, 94, 0.2); margin-top: 1rem;">
        <i data-lucide="alert-circle" style="width: 38px; height: 38px; margin: 0 auto 0.75rem; color: var(--accent-rose);"></i>
        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">Unable to load habits</h3>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; max-width: 360px; margin-left: auto; margin-right: auto;">${escapeHtml(err.message || 'Data could not be fetched from Supabase.')}</p>
        <button class="btn btn-secondary" onclick="loadDashboard()">
          <i data-lucide="rotate-cw" style="width: 14px; height: 14px;"></i> Retry Connection
        </button>
      </div>
    `;
    lucide.createIcons();
  }
}

function renderHabitCards(habits) {
  const container = document.getElementById('habitsContainer');
  const tileShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';

  if (window.UI && typeof UI.renderHabitCard === 'function') {
    container.innerHTML = habits.map(habit => UI.renderHabitCard(habit, { tileShape })).join('');
  } else {
    const todayStr = Utils.getTodayStr();
    container.innerHTML = habits.map(habit => {
      const isCompletedToday = habit.logs && habit.logs.includes(todayStr);
      const gridDays = Utils.generateGridDays(habit.grid_days || 60);
      const logsSet = new Set(habit.logs || []);

      const stats = Utils.calculateHabitStats(logsSet, habit.frequency_days || 7);
      habit.currentStreak = stats.currentStreak;
      habit.longestStreak = stats.longestStreak;
      habit.streakUnit = stats.streakUnit;
      habit.completionRate = stats.completionRate;
      habit.totalCompletions = stats.totalCompletions;
      habit.thisWeekCompleted = stats.thisWeekCompleted;
      habit.isTargetMetThisWeek = stats.isTargetMetThisWeek;

      const tilesHtml = gridDays.map(day => {
        if (day.isFuture) {
          return `<div class="grid-tile ${tileShape}" style="opacity: 0.12; pointer-events: none;"></div>`;
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
          >
            <div class="tile-tooltip">${day.formatted} ${isCompleted ? '✓ Done' : '○ Not logged'}</div>
          </div>
        `;
      }).join('');

      return `
        <article class="habit-card animate-fade-in" id="card-${habit.id}" data-habit-id="${habit.id}">
          <header class="habit-header">
            <div class="habit-info-group" onclick="window.location.href='/habit-detail.html?id=${habit.id}'" style="cursor: pointer;">
              <div class="habit-icon-badge" style="background-color: ${habit.color};">
                <i data-lucide="${habit.icon || 'zap'}" style="width: 15px; height: 15px;"></i>
              </div>
              <div class="habit-text">
                <a href="/habit-detail.html?id=${habit.id}" class="habit-title" onclick="event.stopPropagation()">${escapeHtml(habit.title)}</a>
                <span class="habit-desc">${escapeHtml(habit.description || habit.category || 'Daily')}</span>
              </div>
            </div>
            <div class="habit-meta-actions">
              <div class="streak-badge ${habit.currentStreak > 0 ? 'active-fire' : ''}" id="streak-${habit.id}">
                <i data-lucide="flame" style="width: 14px; height: 14px;"></i>
                <span class="streak-val">${habit.currentStreak || 0}${habit.streakUnit || 'd'}</span>
              </div>
              <button class="quick-check-btn ${isCompletedToday ? 'completed' : ''}" id="check-${habit.id}" style="${isCompletedToday ? `background-color: ${habit.color};` : ''}" onclick="handleQuickTodayToggle('${habit.id}', this, event)">
                <i data-lucide="check" style="width: 18px; height: 18px; stroke-width: 3;"></i>
              </button>
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
            <a href="/habit-detail.html?id=${habit.id}" class="habit-details-link">
              <span>Details</span> <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
            </a>
          </footer>
        </article>
      `;
    }).join('');
  }
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

async function handleTileClick(habitId, dateStr, tileElem, event) {
  if (event) event.stopPropagation();

  // Strict Online Guard: Prevent offline check-in and mutation
  if (window.OnlineGuard && (!window.OnlineGuard.isOnline || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    window.OnlineGuard.show('An active internet connection is required to check in habits.');
    return;
  }

  Utils.playSound('click');

  const habit = habitsData.find(h => h.id === habitId);
  if (!habit) return;

  const logsSet = new Set(habit.logs || []);
  const willBeCompleted = !logsSet.has(dateStr);
  const todayStr = Utils.getTodayStr();

  if (!tileElem) {
    tileElem = document.querySelector(`.grid-tile[data-habit-id="${habitId}"][data-date="${dateStr}"]`);
  }

  // 1. In-place Tile DOM update
  if (tileElem) {
    tileElem.classList.remove('tile-pop');
    void tileElem.offsetWidth;
    tileElem.classList.add('tile-pop');

    if (willBeCompleted) {
      tileElem.classList.add('completed');
      tileElem.style.backgroundColor = habit.color;
      tileElem.style.setProperty('--tile-glow-color', habit.color);
      const tooltip = tileElem.querySelector('.tile-tooltip');
      if (tooltip) tooltip.textContent = tooltip.textContent.replace('○ Not logged', '✓ Done');
    } else {
      tileElem.classList.remove('completed');
      tileElem.style.backgroundColor = '';
      const tooltip = tileElem.querySelector('.tile-tooltip');
      if (tooltip) tooltip.textContent = tooltip.textContent.replace('✓ Done', '○ Not logged');
    }
  }

  // 2. Sync Today's check button
  if (dateStr === todayStr) {
    const checkBtn = document.getElementById(`check-${habitId}`);
    if (checkBtn) {
      checkBtn.classList.remove('check-pop');
      void checkBtn.offsetWidth;
      checkBtn.classList.add('check-pop');

      if (willBeCompleted) {
        checkBtn.classList.add('completed');
        checkBtn.style.backgroundColor = habit.color;
      } else {
        checkBtn.classList.remove('completed');
        checkBtn.style.backgroundColor = '';
      }
    }
  }

  // 3. Trigger floating +10 XP animation near interaction on completion
  if (willBeCompleted) {
    let clientX = event ? (event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : null)) : null;
    let clientY = event ? (event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : null)) : null;
    if ((clientX === null || clientY === null) && tileElem) {
      const rect = tileElem.getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top;
    }
    Utils.showFloatingXP(clientX, clientY, '+10 XP');
    Utils.playSound('complete');
  }

  // 4. Update memory & stats immediately
  if (willBeCompleted) {
    logsSet.add(dateStr);
  } else {
    logsSet.delete(dateStr);
  }
  habit.logs = Array.from(logsSet);

  const stats = Utils.calculateHabitStats(logsSet, habit.frequency_days || 7);
  habit.currentStreak = stats.currentStreak;
  habit.longestStreak = stats.longestStreak;
  habit.streakUnit = stats.streakUnit;
  habit.totalCompletions = stats.totalCompletions;
  habit.completionRate = stats.completionRate;
  habit.thisWeekCompleted = stats.thisWeekCompleted;
  habit.isTargetMetThisWeek = stats.isTargetMetThisWeek;

  // Update card stats in DOM
  const streakElem = document.getElementById(`streak-${habitId}`);
  if (streakElem) {
    streakElem.querySelector('.streak-val').textContent = `${habit.currentStreak}${habit.streakUnit || 'd'}`;
    if (habit.currentStreak > 0) {
      streakElem.classList.add('active-fire');
    } else {
      streakElem.classList.remove('active-fire');
    }
  }

  const bestElem = document.getElementById(`best-${habitId}`);
  if (bestElem) bestElem.textContent = `${habit.longestStreak}${habit.streakUnit || 'd'}`;

  const rateElem = document.getElementById(`rate-${habitId}`);
  if (rateElem) rateElem.textContent = `${habit.completionRate}%`;

  const totalElem = document.getElementById(`total-${habitId}`);
  if (totalElem) totalElem.textContent = habit.totalCompletions;

  // Update weekly quota badge if exists
  const cardElem = document.getElementById(`card-${habitId}`);
  if (cardElem && habit.frequency_days < 7) {
    const quotaBadge = cardElem.querySelector('.frequency-quota-badge');
    if (quotaBadge) {
      quotaBadge.className = `frequency-quota-badge ${habit.isTargetMetThisWeek ? 'met' : ''}`;
      quotaBadge.innerHTML = `
        ${habit.isTargetMetThisWeek ? '<i data-lucide="check" style="width: 11px; height: 11px;"></i>' : ''}
        <span>${habit.thisWeekCompleted}/${habit.frequency_days} this week</span>
      `;
      lucide.createIcons();
    }
  }

  // 5. Send API request & reactively refresh Progression Widget
  try {
    const res = await API.toggleLog(habitId, dateStr);
    if (res.success) {
      if (res.habit) {
        Object.assign(habit, res.habit);
        const updatedLogsSet = new Set(habit.logs || []);
        const freshStats = Utils.calculateHabitStats(updatedLogsSet, habit.frequency_days || 7);
        habit.completionRate = freshStats.completionRate;
        habit.currentStreak = freshStats.currentStreak;
        habit.longestStreak = freshStats.longestStreak;
        habit.streakUnit = freshStats.streakUnit;
        habit.totalCompletions = freshStats.totalCompletions;

        // Sync DOM with server values
        if (streakElem) streakElem.querySelector('.streak-val').textContent = `${habit.currentStreak}${habit.streakUnit || 'd'}`;
        if (bestElem) bestElem.textContent = `${habit.longestStreak}${habit.streakUnit || 'd'}`;
        if (rateElem) rateElem.textContent = `${habit.completionRate}%`;
        if (totalElem) totalElem.textContent = habit.totalCompletions;
      }

      const progRes = await API.getProgression();
      if (progRes.success) {
        // 1. Check and trigger congratulations celebration for any newly achieved milestone badges
        if (progRes.achievements && Array.isArray(progRes.achievements)) {
          const newlyUnlocked = progRes.achievements.filter(a => a.unlocked && !knownUnlockedBadges.has(a.id));
          newlyUnlocked.forEach(badge => {
            knownUnlockedBadges.add(badge.id);
            Utils.showMilestoneUnlockedModal(badge);
          });
        }

        // 2. Check for player level-up
        if (userProgressionData && progRes.level > userProgressionData.level) {
          Utils.showLevelUpModal(progRes.level, userProgressionData ? userProgressionData.level : progRes.level - 1);
        }
        userProgressionData = progRes;
        updateWidgetUI(progRes);
      }
    }
  } catch (err) {
    console.error('Error toggling log:', err);
    if (window.OnlineGuard) {
      window.OnlineGuard.show('Habit update failed because cloud connection was lost.');
    }
    loadHabits();
  }
}

async function handleQuickTodayToggle(habitId, checkBtn, event) {
  if (event) event.stopPropagation();
  const todayStr = Utils.getTodayStr();
  const tileElem = document.querySelector(`.grid-tile[data-habit-id="${habitId}"][data-date="${todayStr}"]`);
  handleTileClick(habitId, todayStr, tileElem, event);
}

function calculateLocalStreaks(datesSet) {
  const today = new Date();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  let checkDate = new Date(today);
  let todayStr = Utils.formatYMD(checkDate);

  if (!datesSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (datesSet.has(Utils.formatYMD(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const sortedDates = Array.from(datesSet).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const [py, pm, pd] = sortedDates[i - 1].split('-').map(Number);
      const [cy, cm, cd] = sortedDates[i].split('-').map(Number);
      const diffDays = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return { currentStreak, longestStreak };
}

function setupFilterChips() {
  const chips = document.querySelectorAll('.filter-scroll .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category || 'All';
      if (typeof chip.scrollIntoView === 'function') {
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      loadHabits();
    });
  });
}

function setupEventListeners() {
  const newHabitBtn = document.getElementById('newHabitBtn');
  if (newHabitBtn) {
    newHabitBtn.addEventListener('click', () => openHabitModal());
  }

  const container = document.getElementById('habitsContainer');
  if (container && window.UI && UI.bindGridEvents) {
    UI.bindGridEvents(
      container,
      (habitId, date, tileElem, event) => handleTileClick(habitId, date, tileElem, event),
      (habitId, checkBtn, event) => handleQuickTodayToggle(habitId, checkBtn, event)
    );
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}


function renderDashboardGreeting(longestStreak = 0) {
  const hour = new Date().getHours();
  let timeStr = 'Good evening';
  if (hour < 12) timeStr = 'Good morning';
  else if (hour < 17) timeStr = 'Good afternoon';

  const userName = localStorage.getItem('committed_user_name' || localStorage.getItem('habitkit_user_name')) || 'Tanishk';
  const el = document.getElementById('greetingDashboardTitle');
  if (el) {
    el.innerHTML = `${timeStr}, ${userName} <span style="font-size: 1.3rem;">👋</span>`;
  }
  const pillStreak = document.getElementById('pillStreakDashboard');
  if (pillStreak) {
    pillStreak.textContent = longestStreak;
  }
}
