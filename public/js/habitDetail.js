// Committed Single Habit Deep-Dive - Complete with In-Place Edit Habit Modal

let currentHabit = null;
let currentViewMode = 'year';
let selectedMonthFilter = 'all';
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

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHabitDetail();
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

  document.getElementById('statCurrentStreak').textContent = `${habit.currentStreak || 0}d`;
  document.getElementById('statLongestStreak').textContent = `${habit.longestStreak || 0}d`;
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
    yearContainer.style.display = 'none';
    monthContainer.style.display = 'block';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function renderMonthChips() {
  const container = document.getElementById('monthChipsBar');
  if (!container) return;

  const currentMonthIdx = new Date().getMonth();

  const chipsHtml = [
    `<button class="month-chip ${selectedMonthFilter === 'all' ? 'active' : ''}" onclick="filterMonth('all')">All Months</button>`,
    ...MONTH_NAMES.map((name, idx) => `
      <button class="month-chip ${selectedMonthFilter === String(idx) ? 'active' : ''}" onclick="filterMonth('${idx}')">
        ${name.slice(0, 3)} ${idx === currentMonthIdx ? '•' : ''}
      </button>
    `)
  ];

  container.innerHTML = chipsHtml.join('');
}

function filterMonth(monthIdxStr) {
  selectedMonthFilter = monthIdxStr;
  renderMonthChips();
  renderMonthBreakdown();
  lucide.createIcons();
  Utils.initGlobalTooltips();
}

function renderMonthBreakdown() {
  const currentYear = new Date().getFullYear();
  const container = document.getElementById('monthBreakdownGrid');
  const logsSet = new Set(currentHabit.logs || []);
  const todayStr = Utils.getTodayStr();

  const monthIndices = selectedMonthFilter === 'all' 
    ? Array.from({ length: 12 }, (_, i) => i) 
    : [parseInt(selectedMonthFilter, 10)];

  const cardsHtml = monthIndices.map(mIdx => {
    const mName = MONTH_NAMES[mIdx];
    const firstDay = new Date(currentYear, mIdx, 1);
    const totalDaysInMonth = new Date(currentYear, mIdx + 1, 0).getDate();
    const monthPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
    
    let completedInMonth = 0;
    const miniTiles = [];

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const weekdayHeaders = weekdays.map(w => `<div style="text-align: center; font-size: 0.6rem; color: var(--text-muted); font-weight: 700;">${w}</div>`).join('');

    const leadingBlanks = firstDay.getDay();
    for (let b = 0; b < leadingBlanks; b++) {
      miniTiles.push('<div class="mini-cal-tile" style="opacity: 0.15; pointer-events: none;"></div>');
    }

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const isCompleted = logsSet.has(dateStr);
      if (isCompleted) completedInMonth++;

      const isToday = dateStr === todayStr;
      const bgStyle = isCompleted ? `background-color: ${currentHabit.color};` : '';

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

    return `
      <div class="month-card">
        <div class="month-card-header">
          <span style="font-weight: 800;">${mName} ${currentYear}</span>
          <span class="month-count-pill">${completedInMonth}/${totalDaysInMonth} (${percent}%)</span>
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

async function toggleDetailDate(dateStr, tileElem, event) {
  if (event) event.stopPropagation();
  Utils.playSound('click');

  if (!currentHabit) return;

  const logsSet = new Set(currentHabit.logs || []);
  const willBeCompleted = !logsSet.has(dateStr);

  if (tileElem) {
    tileElem.classList.remove('tile-pop');
    void tileElem.offsetWidth;
    tileElem.classList.add('tile-pop');

    if (willBeCompleted) {
      tileElem.classList.add('completed');
      tileElem.style.backgroundColor = currentHabit.color;
      tileElem.style.setProperty('--tile-glow-color', currentHabit.color);
    } else {
      tileElem.classList.remove('completed');
      tileElem.style.backgroundColor = '';
    }
  }

  if (willBeCompleted && event) {
    Utils.showFloatingXP(event.clientX, event.clientY, '+10 XP');
    Utils.playSound('complete');
  }

  if (willBeCompleted) {
    logsSet.add(dateStr);
  } else {
    logsSet.delete(dateStr);
  }
  currentHabit.logs = Array.from(logsSet);

  currentHabit.totalCompletions = currentHabit.logs.length;
  document.getElementById('statTotalCompletions').textContent = currentHabit.totalCompletions;

  renderTop3Streaks(currentHabit);
  lucide.createIcons();
  Utils.initGlobalTooltips();

  try {
    await API.toggleLog(currentHabit.id, dateStr);
  } catch (err) {
    console.error(err);
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
