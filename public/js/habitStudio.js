// Committed Habit Studio / Modal Form Controller

let studioSelectedColor = '#10B981';
let studioSelectedIcon = 'zap';

const STUDIO_COLORS = [
  '#10B981', '#059669', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#6B7280'
];

const STUDIO_ICONS = [
  'zap', 'dumbbell', 'droplets', 'book', 'flame', 'sparkles',
  'heart', 'smile', 'sun', 'moon', 'coffee', 'apple',
  'target', 'award', 'shield', 'trophy', 'check-circle', 'star'
];

function openHabitModal() {
  document.getElementById('modalTitle').textContent = 'Create Habit';
  document.getElementById('habitTitleInput').value = '';
  document.getElementById('habitDescInput').value = '';
  if (document.getElementById('habitFrequencySelect')) {
    document.getElementById('habitFrequencySelect').value = '7';
  }
  document.getElementById('habitGridDaysSelect').value = '365';

  studioSelectedColor = '#10B981';
  studioSelectedIcon = 'zap';

  loadCategoriesDropdown();
  renderStudioPalette();
  renderStudioIconPicker();

  document.getElementById('habitModalOverlay').classList.add('open');
}

function closeHabitModal() {
  document.getElementById('habitModalOverlay').classList.remove('open');
}

async function loadCategoriesDropdown() {
  try {
    const res = await API.getCategories();
    const select = document.getElementById('habitCategorySelect');
    if (res.success && res.categories && select) {
      select.innerHTML = res.categories.map(c => `
        <option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>
      `).join('');
    }
  } catch (e) {}
}

function renderStudioPalette() {
  const container = document.getElementById('paletteGrid');
  if (!container) return;

  container.innerHTML = STUDIO_COLORS.map(color => `
    <div 
      class="color-swatch ${color === studioSelectedColor ? 'selected' : ''}" 
      style="background-color: ${color};"
      onclick="selectStudioColor('${color}', this)"
    >
      ${color === studioSelectedColor ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
    </div>
  `).join('');
  lucide.createIcons();
}

function selectStudioColor(color, elem) {
  studioSelectedColor = color;
  document.querySelectorAll('#paletteGrid .color-swatch').forEach(s => {
    s.classList.remove('selected');
    s.innerHTML = '';
  });
  if (elem) {
    elem.classList.add('selected');
    elem.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
    lucide.createIcons();
  }
}

function renderStudioIconPicker() {
  const container = document.getElementById('iconPickerGrid');
  if (!container) return;

  container.innerHTML = STUDIO_ICONS.map(iconName => `
    <div 
      class="icon-choice ${iconName === studioSelectedIcon ? 'selected' : ''}"
      onclick="selectStudioIcon('${iconName}', this)"
    >
      <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
    </div>
  `).join('');
  lucide.createIcons();
}

function selectStudioIcon(iconName, elem) {
  studioSelectedIcon = iconName;
  document.querySelectorAll('#iconPickerGrid .icon-choice').forEach(i => i.classList.remove('selected'));
  if (elem) elem.classList.add('selected');
}

async function saveHabitForm(e) {
  e.preventDefault();
  const title = document.getElementById('habitTitleInput').value.trim();
  const description = document.getElementById('habitDescInput').value.trim();
  const category = document.getElementById('habitCategorySelect').value;
  const frequency_days = document.getElementById('habitFrequencySelect') 
    ? parseInt(document.getElementById('habitFrequencySelect').value, 10) 
    : 7;
  const grid_days = parseInt(document.getElementById('habitGridDaysSelect').value, 10) || 60;

  if (!title) return;

  const habitData = {
    title,
    description,
    category,
    frequency_days,
    grid_days,
    color: studioSelectedColor,
    icon: studioSelectedIcon
  };

  try {
    const res = await API.createHabit(habitData);
    if (res.success) {
      closeHabitModal();
      if (typeof loadDashboard === 'function') {
        loadDashboard();
      }
    } else {
      alert('Failed to create habit: ' + (res.message || 'Error'));
    }
  } catch (err) {
    console.error('Error creating habit:', err);
  }
}
