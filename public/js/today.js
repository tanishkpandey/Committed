/**
 * Committed - Today Screen Controller
 * Zero-flicker, reactive, high-performance logic for the Today dashboard.
 * Full sync with Habits tab, progression engine, XP, audio, and haptics.
 */

let habitsData = [];
let userProgressionData = null;
let knownUnlockedBadges = new Set();
let isToggling = false;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadTodayData();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme') || localStorage.getItem('habitkit_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (window.Utils && Utils.syncMobileThemeColor) {
    Utils.syncMobileThemeColor(saved);
  }
}

/**
 * Loads habits and player progression data simultaneously
 */
async function loadTodayData() {
  renderShortDate();

  try {
    const [habitsRes, progRes] = await Promise.all([
      API.getHabits('All'),
      API.getProgression().catch(() => ({ success: false }))
    ]);

    if (progRes && progRes.success) {
      userProgressionData = progRes;
      if (progRes.achievements && Array.isArray(progRes.achievements)) {
        knownUnlockedBadges = new Set(progRes.achievements.filter(a => a.unlocked).map(a => a.id));
      }
      updateLevelChip(progRes.level || 1);
    }

    if (habitsRes && habitsRes.success) {
      habitsData = habitsRes.habits || [];
      renderTodayScreen();
    } else {
      renderErrorState(habitsRes ? habitsRes.error : 'Failed to load habits');
    }
  } catch (err) {
    console.error('Error loading Today data:', err);
    renderErrorState(err.message || 'Network error');
  }
}

/**
 * Formats and renders short today's date (example: "Sat, 17 Oct")
 */
function renderShortDate() {
  const dateEl = document.getElementById('todayDateLabel');
  if (!dateEl) return;
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  dateEl.textContent = `${weekday}, ${day} ${month}`;
}

/**
 * Updates small level chip (Lv 17)
 */
function updateLevelChip(level) {
  const chipText = document.getElementById('todayLevelText');
  if (chipText) {
    chipText.textContent = `Lv ${level}`;
  }
}

/**
 * Returns Monday through Sunday day objects for the current week
 */
function getCurrentWeekDays() {
  const now = new Date();
  // In JS, getDay() returns 0 for Sunday, 1 for Monday... 6 for Saturday
  const dayIndex = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayIndex);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = window.Utils && Utils.formatYMD ? Utils.formatYMD(d) : d.toISOString().slice(0, 10);
    const isToday = (dateStr === todayStr);
    const isFuture = (dateStr > todayStr);

    days.push({
      label: weekdays[i],
      date: dateStr,
      isToday,
      isFuture,
      dayNum: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    });
  }
  return days;
}

/**
 * Generates matrix of 12 weeks ending on current week (84 days total)
 */
function get12WeeksData() {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - dayIndex);
  currentMonday.setHours(0, 0, 0, 0);

  // Start Monday is 11 weeks prior to current week's Monday (12 weeks total)
  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - (11 * 7));

  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);
  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + (w * 7));

    const m = weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        weekIndex: w,
        name: weekStart.toLocaleDateString('en-US', { month: 'short' })
      });
      lastMonth = m;
    } else {
      monthLabels.push({
        weekIndex: w,
        name: ''
      });
    }

    const days = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      const dateStr = window.Utils && Utils.formatYMD ? Utils.formatYMD(dayDate) : dayDate.toISOString().slice(0, 10);
      const isToday = (dateStr === todayStr);
      const isFuture = (dateStr > todayStr);

      days.push({
        date: dateStr,
        isToday,
        isFuture,
        dayOfWeek: d
      });
    }
    weeks.push(days);
  }

  return { weeks, monthLabels };
}

function get16WeeksData() {
  return get12WeeksData();
}

/**
 * Main render function for the entire Today screen
 */
function renderTodayScreen() {
  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);

  // Calculate habit stats for streaks
  habitsData.forEach(h => {
    const logsSet = new Set(h.logs || []);
    if (window.Utils && Utils.calculateHabitStats) {
      const s = Utils.calculateHabitStats(logsSet, h.frequency_days || 7);
      h.currentStreak = s.currentStreak;
      h.longestStreak = s.longestStreak;
      h.streakUnit = s.streakUnit;
    } else {
      h.currentStreak = h.currentStreak || 0;
      h.streakUnit = 'd';
    }
  });

  const total = habitsData.length;
  const doneToday = habitsData.filter(h => h.logs && h.logs.includes(todayStr)).length;

  // 1. Big Progress Headline
  const headlineEl = document.getElementById('todayProgressHeadline');
  if (headlineEl) {
    if (total === 0) {
      headlineEl.textContent = 'Start your first habit';
    } else if (doneToday === total && total > 0) {
      headlineEl.textContent = 'All done today';
    } else {
      headlineEl.textContent = `${doneToday} of ${total} done`;
    }
  }

  // 2. Habit List Card
  renderHabitsList(habitsData, todayStr);

  // 3. Nudge Strip
  renderNudgeStrip(habitsData, todayStr);

  // 4. Combined 16-Week Heatmap
  renderCombinedHeatmap(habitsData);

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Renders the single card containing all habit rows
 */
function renderHabitsList(habits, todayStr) {
  const container = document.getElementById('todayHabitsContainer');
  if (!container) return;

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="today-empty-card">
        <div class="today-empty-icon">
          <i data-lucide="sparkles" style="width: 24px; height: 24px;"></i>
        </div>
        <h3 class="today-empty-title">Start your first habit</h3>
        <p class="today-empty-desc">Create your first habit to begin checking in and building daily momentum.</p>
        <button class="btn btn-primary" onclick="openHabitModal()" style="display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 auto;">
          <i data-lucide="plus" style="width: 15px; height: 15px;"></i>
          <span>Create habit</span>
        </button>
      </div>
    `;
    return;
  }

  const weekDays = getCurrentWeekDays();

  const rowsHtml = habits.map(habit => {
    const isCompletedToday = habit.logs && habit.logs.includes(todayStr);
    const logsSet = new Set(habit.logs || []);

    const weekStripHtml = weekDays.map(day => {
      const isDone = logsSet.has(day.date);
      const isToday = day.isToday;
      const isFuture = day.isFuture;

      let classes = ['today-strip-square'];
      if (isDone) classes.push('done');
      if (isToday) classes.push('is-today');
      if (isFuture) classes.push('is-future');

      const bgStyle = isDone ? `background-color: ${habit.color};` : '';
      const titleAttr = `${day.dayName}: ${isDone ? 'Completed' : 'Not completed'}`;

      return `
        <div class="today-strip-day">
          <span class="today-strip-label">${day.label}</span>
          <button 
            type="button"
            class="${classes.join(' ')}"
            style="${bgStyle}"
            title="${titleAttr}"
            aria-label="${titleAttr}"
            data-habit-id="${habit.id}"
            data-date="${day.date}"
            onclick="handleStripDayToggle('${habit.id}', '${day.date}', this, event)"
          ></button>
        </div>
      `;
    }).join('');

    return `
      <div class="today-habit-row" id="row-${habit.id}" data-habit-id="${habit.id}">
        <div class="today-row-left">
          <!-- Big 30px Circle on Left -->
          <button 
            type="button"
            class="today-check-circle ${isCompletedToday ? 'completed' : ''}"
            id="today-check-${habit.id}"
            style="${isCompletedToday ? `background-color: ${habit.color}; --circle-glow: ${habit.color};` : ''}"
            onclick="handleTodayCircleToggle('${habit.id}', this, event)"
            aria-label="Toggle ${escapeHtml(habit.title)} for today"
            title="${isCompletedToday ? 'Mark incomplete for today' : 'Check in today'}"
          >
            ${isCompletedToday ? '<i data-lucide="check" style="width: 18px; height: 18px; stroke-width: 3.2;"></i>' : ''}
          </button>

          <!-- Habit Name and Flame Streak -->
          <div class="today-habit-info">
            <a href="/habit-detail.html?id=${habit.id}" class="today-habit-title" title="${escapeHtml(habit.title)}">
              ${escapeHtml(habit.title)}
            </a>
            <div class="today-streak-badge ${habit.currentStreak > 0 ? 'active' : ''}" id="today-streak-${habit.id}">
              <i data-lucide="flame" style="width: 13px; height: 13px;"></i>
              <span class="streak-text">${habit.currentStreak || 0}${habit.streakUnit || 'd'}</span>
            </div>
          </div>
        </div>

        <!-- 7 Square Week Strip -->
        <div class="today-week-strip" id="strip-${habit.id}">
          ${weekStripHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="today-habits-card">
      ${rowsHtml}
    </div>
  `;
}

/**
 * Nudge strip below habit list:
 * "Finish [habit] to keep your [n] day streak"
 * Shows for the first unfinished habit. Hides when all are done.
 */
function renderNudgeStrip(habits, todayStr) {
  const nudgeContainer = document.getElementById('todayNudgeContainer');
  if (!nudgeContainer) return;

  if (!habits || habits.length === 0) {
    nudgeContainer.style.display = 'none';
    return;
  }

  const firstUnfinished = habits.find(h => !h.logs || !h.logs.includes(todayStr));

  if (!firstUnfinished) {
    // All habits are completed today!
    nudgeContainer.style.display = 'none';
    return;
  }

  nudgeContainer.style.display = 'flex';
  const streak = firstUnfinished.currentStreak || 0;
  const habitTitle = escapeHtml(firstUnfinished.title);

  let message = '';
  if (streak > 0) {
    message = `Finish <strong>${habitTitle}</strong> to keep your <strong>${streak} day streak</strong>`;
  } else {
    message = `Finish <strong>${habitTitle}</strong> to start a new streak today`;
  }

  nudgeContainer.innerHTML = `
    <div class="today-nudge-icon">
      <i data-lucide="flame" style="width: 15px; height: 15px;"></i>
    </div>
    <div class="today-nudge-text">${message}</div>
  `;
}

/**
 * Combined Heatmap Card: "Your last 12 weeks"
 * Merges all habits, with month labels, live intensity updates, and link to Progress.
 */
function renderCombinedHeatmap(habits) {
  const container = document.getElementById('todayHeatmapContainer');
  if (!container) return;

  const { weeks, monthLabels } = get12WeeksData();
  const totalHabits = habits.length;
  let totalCompletions = 0;

  // Render month labels row
  const monthsHtml = monthLabels.map(m => `
    <div class="today-heatmap-month-col">${m.name || ''}</div>
  `).join('');

  // Render 12 columns x 7 rows matrix
  const matrixHtml = weeks.map(weekDays => {
    const tilesHtml = weekDays.map(day => {
      const doneCount = habits.filter(h => h.logs && h.logs.includes(day.date)).length;
      totalCompletions += doneCount;
      const ratio = totalHabits > 0 ? (doneCount / totalHabits) : 0;

      let bgStyle = '';
      let isCompleted = false;

      if (doneCount > 0) {
        isCompleted = true;
        if (ratio <= 0.25) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.35);';
        } else if (ratio <= 0.50) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.60);';
        } else if (ratio <= 0.85) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.82);';
        } else {
          bgStyle = 'background-color: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.45);';
        }
      }

      const todayClass = day.isToday ? 'is-today' : '';
      const tooltipText = `${day.date}: ${doneCount} of ${totalHabits} habit${totalHabits === 1 ? '' : 's'} completed`;

      return `
        <div 
          class="today-heatmap-tile ${todayClass}"
          id="combined-tile-${day.date}"
          style="${bgStyle}"
          data-date="${day.date}"
          data-done="${doneCount}"
          title="${tooltipText}"
          aria-label="${tooltipText}"
        ></div>
      `;
    }).join('');

    return `
      <div class="today-heatmap-week-col">
        ${tilesHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="today-heatmap-card">
      <div class="today-heatmap-header">
        <h3 class="today-heatmap-title">Your last 12 weeks</h3>
        <div class="today-heatmap-legend" aria-hidden="true">
          <span>Less</span>
          <span class="today-legend-tile" style="background: var(--tile-empty, rgba(255,255,255,0.05)); border: 1px solid var(--border-subtle);"></span>
          <span class="today-legend-tile" style="background: rgba(16, 185, 129, 0.35);"></span>
          <span class="today-legend-tile" style="background: rgba(16, 185, 129, 0.60);"></span>
          <span class="today-legend-tile" style="background: rgba(16, 185, 129, 0.82);"></span>
          <span class="today-legend-tile" style="background: #10b981;"></span>
          <span>More</span>
        </div>
      </div>

      <div class="today-heatmap-grid-scroll">
        <div class="today-heatmap-grid">
          <div class="today-heatmap-months-row">
            ${monthsHtml}
          </div>
          <div class="today-heatmap-matrix">
            ${matrixHtml}
          </div>
        </div>
      </div>

      <div class="today-heatmap-footer">
        <div class="today-heatmap-summary" id="todayHeatmapSummary">
          ${totalCompletions.toLocaleString()} check-ins across past 12 weeks
        </div>
        <a href="/progress.html#activity" class="habit-details-link" title="Explore 26 weeks or full year in Progress">
          <span>View all activity</span><i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
        </a>
      </div>
    </div>
  `;

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Handles tapping the big 30px check circle for today
 */
async function handleTodayCircleToggle(habitId, circleElem, event) {
  if (event) event.stopPropagation();
  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);
  await toggleHabitLog(habitId, todayStr, circleElem, event);
}

/**
 * Handles clicking a day in the 7 square week strip
 */
async function handleStripDayToggle(habitId, dateStr, squareElem, event) {
  if (event) event.stopPropagation();
  await toggleHabitLog(habitId, dateStr, squareElem, event);
}

/**
 * Core check-in toggle engine
 * Keeps local state, DOM, XP, sound, haptics, confetti, and server in 100% sync.
 */
async function toggleHabitLog(habitId, dateStr, triggerElem, event) {
  // Strict Online Guard: Prevent offline check-in and mutation
  if (window.OnlineGuard && (!window.OnlineGuard.isOnline || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    window.OnlineGuard.show('An active internet connection is required to check in habits.');
    return;
  }

  const habit = habitsData.find(h => h.id === habitId);
  if (!habit) return;

  if (window.Utils) {
    Utils.playSound('click');
  }

  const logsSet = new Set(habit.logs || []);
  const willBeCompleted = !logsSet.has(dateStr);
  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);

  // 1. Audio, Haptic & Floating XP
  if (willBeCompleted) {
    if (window.Utils) {
      Utils.playSound('complete');
      Utils.triggerHaptic('medium');
      let clientX = event ? (event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : null)) : null;
      let clientY = event ? (event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : null)) : null;
      if ((clientX === null || clientY === null) && triggerElem) {
        const rect = triggerElem.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top;
      }
      Utils.showFloatingXP(clientX, clientY, '+10 XP');
    }
    logsSet.add(dateStr);
  } else {
    if (window.Utils) {
      Utils.triggerHaptic('light');
      let clientX = event ? (event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : null)) : null;
      let clientY = event ? (event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : null)) : null;
      if ((clientX === null || clientY === null) && triggerElem) {
        const rect = triggerElem.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top;
      }
      Utils.showFloatingXP(clientX, clientY, '-10 XP');
    }
    logsSet.delete(dateStr);
  }

  habit.logs = Array.from(logsSet);

  // 2. Recalculate streak stats
  if (window.Utils && Utils.calculateHabitStats) {
    const s = Utils.calculateHabitStats(logsSet, habit.frequency_days || 7);
    habit.currentStreak = s.currentStreak;
    habit.longestStreak = s.longestStreak;
    habit.streakUnit = s.streakUnit;
  }

  // 3. In-place DOM updates for immediate responsiveness
  updateHabitRowDOM(habit, dateStr, todayStr);
  updateLiveHeadlineAndNudge(todayStr);
  updateLiveHeatmapTile(dateStr);

  // 4. API call & progression synchronization
  try {
    const res = await API.toggleLog(habitId, dateStr);
    if (res.success) {
      if (res.habit) {
        Object.assign(habit, res.habit);
        const updatedLogs = new Set(habit.logs || []);
        if (window.Utils && Utils.calculateHabitStats) {
          const freshStats = Utils.calculateHabitStats(updatedLogs, habit.frequency_days || 7);
          habit.currentStreak = freshStats.currentStreak;
          habit.longestStreak = freshStats.longestStreak;
          habit.streakUnit = freshStats.streakUnit;
        }
        updateHabitRowDOM(habit, dateStr, todayStr);
      }

      const progRes = await API.getProgression();
      if (progRes.success) {
        // Check for unlocked badges & level up
        if (progRes.achievements && Array.isArray(progRes.achievements)) {
          const newlyUnlocked = progRes.achievements.filter(a => a.unlocked && !knownUnlockedBadges.has(a.id));
          newlyUnlocked.forEach(badge => {
            knownUnlockedBadges.add(badge.id);
            if (window.Utils && Utils.showMilestoneUnlockedModal) {
              Utils.showMilestoneUnlockedModal(badge);
            }
          });
        }

        if (userProgressionData && progRes.level > userProgressionData.level) {
          if (window.Utils && Utils.showLevelUpModal) {
            Utils.showLevelUpModal(progRes.level, userProgressionData.level);
          }
        }

        userProgressionData = progRes;
        updateLevelChip(progRes.level || 1);
      }

      // If all habits are completed for today, fire congratulations confetti!
      const allDone = habitsData.every(h => h.logs && h.logs.includes(todayStr));
      if (willBeCompleted && allDone && habitsData.length > 0) {
        if (window.Utils && Utils.fireConfetti) {
          Utils.fireConfetti();
        }
      }
    }
  } catch (err) {
    console.error('Error toggling habit log:', err);
    // Roll back optimistic state on network failure
    if (willBeCompleted) {
      logsSet.delete(dateStr);
    } else {
      logsSet.add(dateStr);
    }
    habit.logs = Array.from(logsSet);
    if (window.Utils && Utils.calculateHabitStats) {
      const s = Utils.calculateHabitStats(logsSet, habit.frequency_days || 7);
      habit.currentStreak = s.currentStreak;
      habit.longestStreak = s.longestStreak;
      habit.streakUnit = s.streakUnit;
    }
    updateHabitRowDOM(habit, dateStr, todayStr);
    updateLiveHeadlineAndNudge(todayStr);
    updateLiveHeatmapTile(dateStr);

    if (window.OnlineGuard) {
      window.OnlineGuard.show('Habit update failed because cloud connection was lost.');
    }
  }
}

/**
 * Fast in-place DOM updater for habit row elements
 */
function updateHabitRowDOM(habit, toggledDate, todayStr) {
  const isDoneToday = habit.logs && habit.logs.includes(todayStr);

  // Update 30px Circle
  const circleBtn = document.getElementById(`today-check-${habit.id}`);
  if (circleBtn) {
    if (isDoneToday) {
      circleBtn.classList.add('completed');
      circleBtn.style.backgroundColor = habit.color;
      circleBtn.style.setProperty('--circle-glow', habit.color);
      circleBtn.innerHTML = '<i data-lucide="check" style="width: 18px; height: 18px; stroke-width: 3.2;"></i>';
      circleBtn.title = 'Mark incomplete for today';
    } else {
      circleBtn.classList.remove('completed');
      circleBtn.style.backgroundColor = '';
      circleBtn.style.removeProperty('--circle-glow');
      circleBtn.innerHTML = '';
      circleBtn.title = 'Check in today';
    }
  }

  // Update Streak text & fire icon
  const streakBadge = document.getElementById(`today-streak-${habit.id}`);
  if (streakBadge) {
    const textEl = streakBadge.querySelector('.streak-text');
    if (textEl) {
      textEl.textContent = `${habit.currentStreak || 0}${habit.streakUnit || 'd'}`;
    }
    if (habit.currentStreak > 0) {
      streakBadge.classList.add('active');
    } else {
      streakBadge.classList.remove('active');
    }
  }

  // Update square in week strip
  const squareBtn = document.querySelector(`.today-strip-square[data-habit-id="${habit.id}"][data-date="${toggledDate}"]`);
  if (squareBtn) {
    const isDone = habit.logs && habit.logs.includes(toggledDate);
    if (isDone) {
      squareBtn.classList.add('done');
      squareBtn.style.backgroundColor = habit.color;
    } else {
      squareBtn.classList.remove('done');
      squareBtn.style.backgroundColor = '';
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Updates headline count and nudge strip live
 */
function updateLiveHeadlineAndNudge(todayStr) {
  const total = habitsData.length;
  const doneToday = habitsData.filter(h => h.logs && h.logs.includes(todayStr)).length;

  const headlineEl = document.getElementById('todayProgressHeadline');
  if (headlineEl) {
    if (total === 0) {
      headlineEl.textContent = 'Start your first habit';
    } else if (doneToday === total && total > 0) {
      headlineEl.textContent = 'All done today';
    } else {
      headlineEl.textContent = `${doneToday} of ${total} done`;
    }
  }

  renderNudgeStrip(habitsData, todayStr);
}

/**
 * Live updates intensity of square in 16-week combined heatmap
 */
function updateLiveHeatmapTile(dateStr) {
  const tile = document.getElementById(`combined-tile-${dateStr}`);
  if (!tile) return;

  const totalHabits = habitsData.length;
  const doneCount = habitsData.filter(h => h.logs && h.logs.includes(dateStr)).length;
  const ratio = totalHabits > 0 ? (doneCount / totalHabits) : 0;

  tile.dataset.done = doneCount;
  const tooltipText = `${dateStr}: ${doneCount} of ${totalHabits} habit${totalHabits === 1 ? '' : 's'} completed`;
  tile.title = tooltipText;
  tile.setAttribute('aria-label', tooltipText);

  if (doneCount === 0) {
    tile.style.backgroundColor = '';
    tile.style.boxShadow = '';
  } else if (ratio <= 0.25) {
    tile.style.backgroundColor = 'rgba(16, 185, 129, 0.35)';
    tile.style.boxShadow = '';
  } else if (ratio <= 0.50) {
    tile.style.backgroundColor = 'rgba(16, 185, 129, 0.60)';
    tile.style.boxShadow = '';
  } else if (ratio <= 0.85) {
    tile.style.backgroundColor = 'rgba(16, 185, 129, 0.82)';
    tile.style.boxShadow = '';
  } else {
    tile.style.backgroundColor = '#10b981';
    tile.style.boxShadow = '0 0 6px rgba(16, 185, 129, 0.45)';
  }

  updateLiveHeatmapSummary();
}

/**
 * Live updates the total check-in count in the 12-week heatmap footer
 */
function updateLiveHeatmapSummary() {
  const summaryEl = document.getElementById('todayHeatmapSummary');
  if (!summaryEl) return;
  const { weeks } = get12WeeksData();
  let totalCompletions = 0;
  weeks.forEach(weekDays => {
    weekDays.forEach(day => {
      totalCompletions += habitsData.filter(h => h.logs && h.logs.includes(day.date)).length;
    });
  });
  summaryEl.textContent = `${totalCompletions.toLocaleString()} check-ins across past 12 weeks`;
}

/**
 * Error state display
 */
function renderErrorState(message) {
  const container = document.getElementById('todayHabitsContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="today-empty-card" style="border-color: rgba(244, 63, 94, 0.3);">
      <div class="today-empty-icon" style="background: rgba(244, 63, 94, 0.12); color: var(--accent-rose);">
        <i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i>
      </div>
      <h3 class="today-empty-title">Unable to load today's habits</h3>
      <p class="today-empty-desc">${escapeHtml(message)}</p>
      <button class="btn btn-secondary" onclick="loadTodayData()">
        <i data-lucide="rotate-cw" style="width: 14px; height: 14px;"></i> Retry
      </button>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}
