// Committed Dashboard Controller with Reactive Progress Widget

let currentCategory = 'All';
let habitsData = [];
let userProgressionData = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderDashboardGreeting();
  loadDashboard();
  setupFilterChips();
  setupEventListeners();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

async function loadDashboard() {
  await Promise.all([loadHabits(), loadProgressionWidget()]);
}

async function loadProgressionWidget() {
  try {
    const res = await API.getProgression();
    if (!res.success) return;
    userProgressionData = res;
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
  if (xpCounts) xpCounts.textContent = `${data.totalXP.toLocaleString()} / ${data.nextLevelTargetXP.toLocaleString()} XP`;
  if (fill) fill.style.width = `${data.progressPercent}%`;
  if (streakText) streakText.textContent = `${data.lifetimeStats.perfectDaysStreak || 0} Perfect Day Streak`;
  renderDashboardGreeting(data.lifetimeStats.longestStreak || 19);
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

    if (!res.success || !res.habits || res.habits.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <i data-lucide="sparkles" style="width: 42px; height: 42px; margin: 0 auto 0.85rem; opacity: 0.5;"></i>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">No habits yet</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Create your first habit to start building your streak grid!</p>
          <button class="btn btn-primary" onclick="openHabitModal()">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Create Habit
          </button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    habitsData = res.habits;
    renderHabitCards(habitsData);
  } catch (err) {
    if (skeleton) skeleton.style.display = 'none';
    container.innerHTML = `<div style="text-align: center; color: var(--accent-rose); padding: 2rem;">Failed to load habits.</div>`;
  }
}

function renderHabitCards(habits) {
  const container = document.getElementById('habitsContainer');
  const tileShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';
  const todayStr = Utils.getTodayStr();

  container.innerHTML = habits.map(habit => {
    const isCompletedToday = habit.logs && habit.logs.includes(todayStr);
    const gridDays = Utils.generateGridDays(habit.grid_days || 60);
    const logsSet = new Set(habit.logs || []);

    const tilesHtml = gridDays.map(day => {
      if (day.isFuture) {
        return `<div class="grid-tile ${tileShape}" style="opacity: 0.12; pointer-events: none;"></div>`;
      }

      const isCompleted = logsSet.has(day.date);
      const bgStyle = isCompleted 
        ? `background-color: ${habit.color}; --tile-glow-color: ${habit.color};` 
        : '';
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
      <div class="habit-card animate-fade-in" id="card-${habit.id}">
        <div class="habit-header">
          <div class="habit-info-group">
            <div class="habit-icon-badge" style="background-color: ${habit.color};">
              <i data-lucide="${habit.icon || 'zap'}" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="habit-text">
              <a href="/habit-detail.html?id=${habit.id}" class="habit-title">${escapeHtml(habit.title)}</a>
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem;">
                <span class="habit-desc">${escapeHtml(habit.description || habit.category || 'Daily')}</span>
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
            <button 
              class="quick-check-btn ${isCompletedToday ? 'completed' : ''}" 
              id="check-${habit.id}"
              style="${isCompletedToday ? `background-color: ${habit.color};` : ''}"
              onclick="handleQuickTodayToggle('${habit.id}', this, event)"
              title="Toggle Today Completion"
            >
              <i data-lucide="check" style="width: 18px; height: 18px; stroke-width: 3;"></i>
            </button>
          </div>
        </div>

        <div class="grid-wrapper">
          <div class="contribution-grid" id="grid-${habit.id}">
            ${tilesHtml}
          </div>
        </div>

        <div class="habit-footer">
          <div class="stat-item">
            <span>30-Day:</span>
            <span class="stat-highlight rate-val" id="rate-${habit.id}" style="color: ${habit.color};">${habit.completionRate || 0}%</span>
          </div>
          <div class="stat-item">
            <span>Best:</span>
            <span class="stat-highlight" id="best-${habit.id}">${habit.longestStreak || 0}d</span>
          </div>
          <div class="stat-item">
            <span>Total:</span>
            <span class="stat-highlight" id="total-${habit.id}">${habit.totalCompletions || 0}</span>
          </div>
          <a href="/habit-detail.html?id=${habit.id}" style="color: var(--text-muted); text-decoration: none; display: flex; align-items: center; gap: 0.2rem;">
            <span>Details</span> <i data-lucide="chevron-right" style="width: 13px; height: 13px;"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
  Utils.initGlobalTooltips();
}

async function handleTileClick(habitId, dateStr, tileElem, event) {
  if (event) event.stopPropagation();
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

  // 2. Sync Today's check button & streak icon (flame <-> hourglass)
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
  if (willBeCompleted && event) {
    Utils.showFloatingXP(event.clientX, event.clientY, '+10 XP');
    Utils.playSound('complete');
  }

  // 4. Update memory & streaks
  if (willBeCompleted) {
    logsSet.add(dateStr);
  } else {
    logsSet.delete(dateStr);
  }
  habit.logs = Array.from(logsSet);

  const newStreaks = calculateLocalStreaks(logsSet);
  habit.currentStreak = newStreaks.currentStreak;
  habit.longestStreak = newStreaks.longestStreak;
  habit.totalCompletions = habit.logs.length;

  const streakElem = document.getElementById(`streak-${habitId}`);
  if (streakElem) {
    streakElem.querySelector('.streak-val').textContent = `${habit.currentStreak}d`;
    if (habit.currentStreak > 0) {
      streakElem.classList.add('active-fire');
    } else {
      streakElem.classList.remove('active-fire');
    }
  }

  const totalElem = document.getElementById(`total-${habitId}`);
  if (totalElem) totalElem.textContent = habit.totalCompletions;

  // 5. Send API request & reactively refresh Progression Widget
  try {
    const res = await API.toggleLog(habitId, dateStr);
    if (res.success) {
      const progRes = await API.getProgression();
      if (progRes.success) {
        // Detect level up
        if (userProgressionData && progRes.level > userProgressionData.level) {
          Utils.showLevelUpModal(progRes.level, userProgressionData ? userProgressionData.level : progRes.level - 1);
        }
        userProgressionData = progRes;
        updateWidgetUI(progRes);
      }
    }
  } catch (err) {
    console.error('Error toggling log:', err);
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
      loadHabits();
    });
  });
}

function setupEventListeners() {
  const newHabitBtn = document.getElementById('newHabitBtn');
  if (newHabitBtn) {
    newHabitBtn.addEventListener('click', () => openHabitModal());
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


function renderDashboardGreeting(longestStreak = 19) {
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
