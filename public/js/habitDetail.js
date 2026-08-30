// Committed Single Habit Deep-Dive - Complete with In-Place Edit Habit Modal

let currentHabit = null;
let currentViewMode = 'year';
let selectedMonthIdx = new Date().getMonth(); // 0 - 11, defaults to current month
let detailYear = new Date().getFullYear();
let isAllMonthsView = false;
let editSelectedColor = '#10B981';
let editSelectedIcon = 'zap';

const DETAIL_PALETTE = [
  '#10B981', '#059669', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#6B7280'
];

const DETAIL_ICONS = [
  'zap', 'dumbbell', 'droplets', 'book', 'flame', 'sparkles',
  'heart', 'smile', 'sun', 'moon', 'coffee', 'apple',
  'target', 'award', 'shield', 'trophy', 'check-circle', 'star'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHabitDetail();
  setupDetailKeyboardAndSwipe();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

async function loadHabitDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const habitId = urlParams.get('id');

  if (!habitId) {
    window.location.href = '/';
    return;
  }

  try {
    const res = await API.getHabitById(habitId);
    if (!res.success || !res.habit) {
      document.getElementById('detailContainer').innerHTML = '<div style="text-align: center; padding: 3rem;">Habit not found</div>';
      return;
    }

    currentHabit = res.habit;
    renderHabitDetail(currentHabit);
  } catch (err) {
    console.error('Error loading habit detail:', err);
  }
}

function renderHabitDetail(habit) {
  document.getElementById('habitDetailTitle').textContent = habit.title;
  document.getElementById('habitDetailDesc').textContent = habit.description || habit.category || 'Daily Goal';
  
  const iconBadge = document.getElementById('habitDetailBadge');
  iconBadge.style.backgroundColor = habit.color;
  iconBadge.innerHTML = `<i data-lucide="${habit.icon || 'zap'}" style="width: 22px; height: 22px;"></i>`;

  document.getElementById('statCurrentStreak').textContent = `${habit.currentStreak || 0}${habit.streakUnit || 'd'}`;
  document.getElementById('statLongestStreak').textContent = `${habit.longestStreak || 0}${habit.streakUnit || 'd'}`;
  document.getElementById('statTotalCompletions').textContent = habit.totalCompletions || 0;

  renderActivityDots();
  renderTop3Streaks(habit);
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function setViewMode(mode) {
  currentViewMode = mode;
  const yearBtn = document.getElementById('btnViewYear');
  const monthBtn = document.getElementById('btnViewMonth');

  if (yearBtn) yearBtn.classList.toggle('active', mode === 'year');
  if (monthBtn) monthBtn.classList.toggle('active', mode === 'month');

  renderActivityDots();
}

function renderActivityDots() {
  if (!currentHabit) return;

  const yearContainer = document.getElementById('yearGridWrapper');
  const monthContainer = document.getElementById('monthBreakdownWrapper');

  if (currentViewMode === 'year') {
    yearContainer.style.display = 'block';
    monthContainer.style.display = 'none';
    renderYearGrid();
  } else {
    yearContainer.style.display = 'block'; // Keep wrapper display handled
    yearContainer.style.display = 'none';
    monthContainer.style.display = 'block';
    renderMonthNavigator();
    renderMonthChips();
    renderMonthBreakdown();
  }
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function renderYearGrid() {
  const currentYear = new Date().getFullYear();
  document.getElementById('yearGridTitle').textContent = `${currentYear} Full Activity Grid`;

  const container = document.getElementById('yearGridContainer');
  const logsSet = new Set(currentHabit.logs || []);
  const tileShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';
  const todayStr = Utils.getTodayStr();

  const days = [];
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);

  const startPadding = startDate.getDay();
  for (let p = startPadding; p > 0; p--) {
    const padDate = new Date(startDate);
    padDate.setDate(startDate.getDate() - p);
    days.push({
      date: Utils.formatYMD(padDate),
      isPadding: true
    });
  }

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = Utils.formatYMD(d);
    days.push({
      date: dateStr,
      formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
      isToday: dateStr === todayStr,
      isPadding: false
    });
  }

  container.innerHTML = days.map(day => {
    if (day.isPadding) {
      return `<div class="grid-tile ${tileShape}" style="opacity: 0.08; pointer-events: none;"></div>`;
    }

    const isCompleted = logsSet.has(day.date);
    const bgStyle = isCompleted 
      ? `background-color: ${currentHabit.color}; --tile-glow-color: ${currentHabit.color};` 
      : '';
    const completedClass = isCompleted ? 'completed' : '';
    const todayClass = day.isToday ? 'is-today' : '';

    return `
      <div 
        class="grid-tile ${tileShape} ${completedClass} ${todayClass}"
        style="${bgStyle}"
        data-date="${day.date}"
        onclick="toggleDetailDate('${day.date}', this, event)"
      ></div>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// Month Breakdown Navigation (Prev / Next Arrows & Touch Gestures)
// ------------------------------------------------------------------------------
function prevMonth(e) {
  if (e) e.stopPropagation();
  Utils.playSound('click');
  
  if (isAllMonthsView) {
    detailYear--;
  } else {
    if (selectedMonthIdx > 0) {
      selectedMonthIdx--;
    } else {
      selectedMonthIdx = 11;
      detailYear--;
    }
  }

  renderMonthNavigator();
  renderMonthChips();
  renderMonthBreakdown('prev');
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function nextMonth(e) {
  if (e) e.stopPropagation();
  Utils.playSound('click');

  if (isAllMonthsView) {
    detailYear++;
  } else {
    if (selectedMonthIdx < 11) {
      selectedMonthIdx++;
    } else {
      selectedMonthIdx = 0;
      detailYear++;
    }
  }

  renderMonthNavigator();
  renderMonthChips();
  renderMonthBreakdown('next');
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function filterMonth(monthIdxStr) {
  Utils.playSound('click');
  if (monthIdxStr === 'all') {
    isAllMonthsView = true;
  } else {
    isAllMonthsView = false;
    selectedMonthIdx = parseInt(monthIdxStr, 10);
  }
  renderMonthNavigator();
  renderMonthChips();
  renderMonthBreakdown();
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function renderMonthNavigator() {
  const titleEl = document.getElementById('monthNavigatorTitle');
  const summaryEl = document.getElementById('monthNavigatorSummary');
  if (!titleEl || !summaryEl || !currentHabit) return;

  const logsSet = new Set(currentHabit.logs || []);

  if (isAllMonthsView) {
    titleEl.textContent = `All Months (${detailYear})`;
    const totalLogsInYear = (currentHabit.logs || []).filter(d => d.startsWith(`${detailYear}-`)).length;
    summaryEl.textContent = `${totalLogsInYear} logs in ${detailYear}`;
  } else {
    const mName = MONTH_NAMES[selectedMonthIdx];
    titleEl.textContent = `${mName} ${detailYear}`;

    const monthPrefix = `${detailYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
    const totalDaysInMonth = new Date(detailYear, selectedMonthIdx + 1, 0).getDate();
    let completedInMonth = 0;
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      if (logsSet.has(dateStr)) completedInMonth++;
    }
    const percent = Math.round((completedInMonth / totalDaysInMonth) * 100);
    summaryEl.textContent = `${completedInMonth} / ${totalDaysInMonth} days (${percent}%)`;
  }
}

function renderMonthChips() {
  const container = document.getElementById('monthChipsBar');
  if (!container) return;

  const currentRealMonthIdx = new Date().getMonth();
  const currentRealYear = new Date().getFullYear();

  const chipsHtml = [
    `<button class="month-chip ${isAllMonthsView ? 'active' : ''}" onclick="filterMonth('all')">All Months</button>`,
    ...MONTH_NAMES.map((name, idx) => `
      <button 
        class="month-chip ${!isAllMonthsView && selectedMonthIdx === idx ? 'active' : ''}" 
        id="monthChip-${idx}"
        onclick="filterMonth('${idx}')"
      >
        ${name.slice(0, 3)} ${detailYear === currentRealYear && idx === currentRealMonthIdx ? '•' : ''}
      </button>
    `)
  ];

  container.innerHTML = chipsHtml.join('');

  // Smooth auto-scroll active chip into view on mobile
  if (!isAllMonthsView) {
    setTimeout(() => {
      const activeChip = document.getElementById(`monthChip-${selectedMonthIdx}`);
      if (activeChip && container) {
        const scrollLeft = activeChip.offsetLeft - (container.offsetWidth / 2) + (activeChip.offsetWidth / 2);
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }, 50);
  }
}

function renderMonthBreakdown(animDirection = null) {
  const container = document.getElementById('monthBreakdownGrid');
  if (!container || !currentHabit) return;

  const logsSet = new Set(currentHabit.logs || []);
  const todayStr = Utils.getTodayStr();

  const monthIndices = isAllMonthsView 
    ? Array.from({ length: 12 }, (_, i) => i) 
    : [selectedMonthIdx];

  const cardsHtml = monthIndices.map(mIdx => {
    const mName = MONTH_NAMES[mIdx];
    const firstDay = new Date(detailYear, mIdx, 1);
    const totalDaysInMonth = new Date(detailYear, mIdx + 1, 0).getDate();
    const monthPrefix = `${detailYear}-${String(mIdx + 1).padStart(2, '0')}`;
    
    let completedInMonth = 0;
    const miniTiles = [];

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const weekdayHeaders = weekdays.map(w => `<div class="month-weekday-label">${w}</div>`).join('');

    const leadingBlanks = firstDay.getDay();
    for (let b = 0; b < leadingBlanks; b++) {
      miniTiles.push('<div class="mini-cal-tile blank" style="opacity: 0.12; pointer-events: none;"></div>');
    }

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const isCompleted = logsSet.has(dateStr);
      if (isCompleted) completedInMonth++;

      const isToday = dateStr === todayStr;
      const bgStyle = isCompleted ? `background-color: ${currentHabit.color}; --tile-glow-color: ${currentHabit.color};` : '';

      miniTiles.push(`
        <div 
          class="mini-cal-tile ${isCompleted ? 'completed' : ''} ${isToday ? 'is-today' : ''}"
          style="${bgStyle}"
          data-date="${dateStr}"
          onclick="toggleDetailDate('${dateStr}', this, event)"
        >
          <span>${dayNum}</span>
        </div>
      `);
    }

    const percent = Math.round((completedInMonth / totalDaysInMonth) * 100);
    const animClass = animDirection === 'prev' ? 'animate-slide-right' : animDirection === 'next' ? 'animate-slide-left' : 'animate-fade-in';

    return `
      <div class="month-card ${animClass}" id="monthCard-${mIdx}">
        <div class="month-card-header">
          <div class="month-card-header-left">
            ${!isAllMonthsView ? `
              <button class="month-card-nav-arrow" onclick="prevMonth(event)" title="Previous Month" aria-label="Previous Month">
                <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
              </button>
            ` : ''}
            <span class="month-card-title">${mName} ${detailYear}</span>
            ${!isAllMonthsView ? `
              <button class="month-card-nav-arrow" onclick="nextMonth(event)" title="Next Month" aria-label="Next Month">
                <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
              </button>
            ` : ''}
          </div>
          <span class="month-count-pill" id="monthCountPill-${mIdx}">${completedInMonth}/${totalDaysInMonth} (${percent}%)</span>
        </div>
        <div class="month-mini-calendar">
          ${weekdayHeaders}
          ${miniTiles.join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml.join('');
}

function setupDetailKeyboardAndSwipe() {
  let touchStartX = 0;
  let touchEndX = 0;

  const wrapper = document.getElementById('monthBreakdownWrapper');
  if (wrapper) {
    wrapper.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    wrapper.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchEndX - touchStartX;
      if (currentViewMode === 'month' && !isAllMonthsView) {
        if (diffX < -50) {
          nextMonth();
        } else if (diffX > 50) {
          prevMonth();
        }
      }
    }, { passive: true });
  }

  document.addEventListener('keydown', e => {
    if (currentViewMode === 'month' && !isAllMonthsView) {
      if (e.key === 'ArrowLeft') {
        prevMonth();
      } else if (e.key === 'ArrowRight') {
        nextMonth();
      }
    }
  });
}

function renderTop3Streaks(habit) {
  const container = document.getElementById('streakHistoryList');
  if (!container) return;

  const top3 = Utils.calculateTop3Streaks(new Set(habit.logs || []));
  if (top3.length === 0) {
    container.innerHTML = `
      <div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 1rem;">
        Log habits consistently to record your top streaks.
      </div>
    `;
    return;
  }

  const rankBadges = ['1st', '2nd', '3rd'];

  container.innerHTML = top3.map((item, index) => `
    <div class="streak-history-item" style="padding: 0.85rem 1rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 32px; height: 32px; border-radius: var(--radius-xs); background: ${index === 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)'}; color: ${index === 0 ? '#f59e0b' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">
          ${rankBadges[index]}
        </div>
        <div>
          <div class="streak-days-badge" style="font-size: 0.92rem;">
            <i data-lucide="flame" style="width: 16px; height: 16px;"></i>
            <span>${item.days} Days Streak</span>
          </div>
          <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 500; margin-top: 0.15rem;">
            ${item.dateRangeFormatted}
          </div>
        </div>
      </div>
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
        ${index === 0 ? '<span style="color: #10b981;">Personal Best</span>' : ''}
      </div>
    </div>
  `).join('');
}

// ------------------------------------------------------------------------------
// Tile Click & Reactive Persistence Engine
// ------------------------------------------------------------------------------
async function toggleDetailDate(dateStr, tileElem, event) {
  if (event) event.stopPropagation();
  Utils.playSound('click');

  if (!currentHabit) return;

  const logsSet = new Set(currentHabit.logs || []);
  const willBeCompleted = !logsSet.has(dateStr);

  // 1. In-place DOM update for all matching tiles across views
  const matchingTiles = document.querySelectorAll(`[data-date="${dateStr}"]`);
  matchingTiles.forEach(tile => {
    tile.classList.remove('tile-pop');
    void tile.offsetWidth;
    tile.classList.add('tile-pop');

    if (willBeCompleted) {
      tile.classList.add('completed');
      tile.style.backgroundColor = currentHabit.color;
      tile.style.setProperty('--tile-glow-color', currentHabit.color);
    } else {
      tile.classList.remove('completed');
      tile.style.backgroundColor = '';
    }
  });

  if (willBeCompleted && event) {
    Utils.showFloatingXP(event.clientX, event.clientY, '+10 XP');
    Utils.playSound('complete');
  }

  // 2. Update memory & stats immediately
  if (willBeCompleted) {
    logsSet.add(dateStr);
  } else {
    logsSet.delete(dateStr);
  }
  currentHabit.logs = Array.from(logsSet);

  const stats = Utils.calculateHabitStats(logsSet, currentHabit.frequency_days || 7);
  currentHabit.currentStreak = stats.currentStreak;
  currentHabit.longestStreak = stats.longestStreak;
  currentHabit.streakUnit = stats.streakUnit;
  currentHabit.totalCompletions = stats.totalCompletions;
  currentHabit.completionRate = stats.completionRate;

  // 3. Update 3-Column Metrics DOM
  const curStreakEl = document.getElementById('statCurrentStreak');
  if (curStreakEl) curStreakEl.textContent = `${currentHabit.currentStreak}${currentHabit.streakUnit || 'd'}`;

  const longestStreakEl = document.getElementById('statLongestStreak');
  if (longestStreakEl) longestStreakEl.textContent = `${currentHabit.longestStreak}${currentHabit.streakUnit || 'd'}`;

  const totalEl = document.getElementById('statTotalCompletions');
  if (totalEl) totalEl.textContent = currentHabit.totalCompletions;

  // 4. Update month breakdown summary & header
  renderMonthNavigator();

  // If on month breakdown, update the month card pill
  const [yStr, mStr] = dateStr.split('-');
  const clickedMonthIdx = parseInt(mStr, 10) - 1;
  const monthPill = document.getElementById(`monthCountPill-${clickedMonthIdx}`);
  if (monthPill && parseInt(yStr, 10) === detailYear) {
    const totalDaysInMonth = new Date(detailYear, clickedMonthIdx + 1, 0).getDate();
    const monthPrefix = `${detailYear}-${mStr}`;
    let count = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      if (logsSet.has(`${monthPrefix}-${String(d).padStart(2, '0')}`)) count++;
    }
    const pct = Math.round((count / totalDaysInMonth) * 100);
    monthPill.textContent = `${count}/${totalDaysInMonth} (${pct}%)`;
  }

  renderTop3Streaks(currentHabit);
  lucide.createIcons();
  Utils.initGlobalTooltips();

  // 5. Send API request to persist log
  try {
    const res = await API.toggleLog(currentHabit.id, dateStr);
    if (res.success && res.habit) {
      Object.assign(currentHabit, res.habit);
      if (curStreakEl) curStreakEl.textContent = `${currentHabit.currentStreak}${currentHabit.streakUnit || 'd'}`;
      if (longestStreakEl) longestStreakEl.textContent = `${currentHabit.longestStreak}${currentHabit.streakUnit || 'd'}`;
      if (totalEl) totalEl.textContent = currentHabit.totalCompletions;
      renderMonthNavigator();
      renderTop3Streaks(currentHabit);
    }
  } catch (err) {
    console.error('Error persisting habit date log:', err);
  }
}

// ------------------------------------------------------------------------------
// Edit Habit Modal Logic
// ------------------------------------------------------------------------------
async function openEditModal() {
  if (!currentHabit) return;

  document.getElementById('editHabitTitle').value = currentHabit.title || '';
  document.getElementById('editHabitDesc').value = currentHabit.description || '';
  document.getElementById('editHabitGridDays').value = currentHabit.grid_days || '60';
  if (document.getElementById('editHabitFrequency')) {
    document.getElementById('editHabitFrequency').value = String(currentHabit.frequency_days || 7);
  }

  editSelectedColor = currentHabit.color || '#10B981';
  editSelectedIcon = currentHabit.icon || 'zap';

  // Load categories
  try {
    const catRes = await API.getCategories();
    const catSelect = document.getElementById('editHabitCategory');
    if (catRes.success && catRes.categories) {
      catSelect.innerHTML = catRes.categories.map(c => `
        <option value="${escapeHtml(c.name)}" ${c.name === currentHabit.category ? 'selected' : ''}>${escapeHtml(c.name)}</option>
      `).join('');
    }
  } catch (e) {}

  renderEditPalette();
  renderEditIconPicker();
  document.getElementById('editHabitModalOverlay').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editHabitModalOverlay').classList.remove('open');
}

function renderEditPalette() {
  const container = document.getElementById('editPaletteGrid');
  if (!container) return;

  container.innerHTML = DETAIL_PALETTE.map(color => `
    <div 
      class="color-swatch ${color === editSelectedColor ? 'selected' : ''}" 
      style="background-color: ${color};"
      onclick="selectEditColor('${color}', this)"
    >
      ${color === editSelectedColor ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
    </div>
  `).join('');
  lucide.createIcons();
}

function selectEditColor(color, elem) {
  editSelectedColor = color;
  document.querySelectorAll('#editPaletteGrid .color-swatch').forEach(s => {
    s.classList.remove('selected');
    s.innerHTML = '';
  });
  if (elem) {
    elem.classList.add('selected');
    elem.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
    lucide.createIcons();
  }
}

function renderEditIconPicker() {
  const container = document.getElementById('editIconPickerGrid');
  if (!container) return;

  container.innerHTML = DETAIL_ICONS.map(iconName => `
    <div 
      class="icon-choice ${iconName === editSelectedIcon ? 'selected' : ''}"
      onclick="selectEditIcon('${iconName}', this)"
    >
      <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
    </div>
  `).join('');
  lucide.createIcons();
}

function selectEditIcon(iconName, elem) {
  editSelectedIcon = iconName;
  document.querySelectorAll('#editIconPickerGrid .icon-choice').forEach(i => i.classList.remove('selected'));
  if (elem) elem.classList.add('selected');
}

async function saveHabitEdits(e) {
  e.preventDefault();
  if (!currentHabit) return;

  const title = document.getElementById('editHabitTitle').value.trim();
  const description = document.getElementById('editHabitDesc').value.trim();
  const category = document.getElementById('editHabitCategory').value;
  const grid_days = parseInt(document.getElementById('editHabitGridDays').value, 10) || 60;
  const frequency_days = document.getElementById('editHabitFrequency') 
    ? parseInt(document.getElementById('editHabitFrequency').value, 10) 
    : 7;

  if (!title) return;

  const updates = {
    title,
    description,
    category,
    grid_days,
    frequency_days,
    color: editSelectedColor,
    icon: editSelectedIcon
  };

  try {
    const res = await API.updateHabit(currentHabit.id, updates);
    if (res.success && res.habit) {
      currentHabit = { ...currentHabit, ...res.habit };
      closeEditModal();
      renderHabitDetail(currentHabit);
    } else {
      alert('Failed to update habit');
    }
  } catch (err) {
    console.error('Error updating habit:', err);
  }
}

async function deleteCurrentHabit() {
  if (!currentHabit) return;
  if (confirm('Are you sure you want to delete this habit and all its logs?')) {
    const res = await API.deleteHabit(currentHabit.id);
    if (res.success) {
      window.location.href = '/';
    }
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
