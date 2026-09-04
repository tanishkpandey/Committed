// Committed Habit Studio / Modal Form Controller

let currentEditingHabitId = null;
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

async function openHabitModal(habit = null) {
  const modalTitle = document.getElementById('modalTitle');
  const titleInput = document.getElementById('habitTitleInput');
  const descInput = document.getElementById('habitDescInput');
  const freqSelect = document.getElementById('habitFrequencySelect');
  const gridSelect = document.getElementById('habitGridDaysSelect');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  await loadCategoriesDropdown();

  if (habit && habit.id) {
    currentEditingHabitId = habit.id;
    if (modalTitle) modalTitle.textContent = 'Edit Habit';
    if (titleInput) titleInput.value = habit.title || '';
    if (descInput) descInput.value = habit.description || '';
    if (freqSelect) freqSelect.value = String(habit.frequency_days || 7);
    if (gridSelect) gridSelect.value = String(habit.grid_days || 60);

    const catSelect = document.getElementById('habitCategorySelect');
    if (catSelect && habit.category) catSelect.value = habit.category;

    studioSelectedColor = habit.color || '#10B981';
    studioSelectedIcon = habit.icon || 'zap';

    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  } else {
    currentEditingHabitId = null;
    if (modalTitle) modalTitle.textContent = 'Create Habit';
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (freqSelect) freqSelect.value = '7';
    if (gridSelect) gridSelect.value = '60';

    studioSelectedColor = '#10B981';
    studioSelectedIcon = 'zap';

    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  renderStudioPalette();
  renderStudioIconPicker();

  const overlay = document.getElementById('habitModalOverlay');
  if (overlay) overlay.classList.add('open');
}

function closeHabitModal() {
  const overlay = document.getElementById('habitModalOverlay');
  if (overlay) overlay.classList.remove('open');
  currentEditingHabitId = null;
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
    let res;
    if (currentEditingHabitId) {
      res = await API.updateHabit(currentEditingHabitId, habitData);
    } else {
      res = await API.createHabit(habitData);
    }

    if (res.success) {
      closeHabitModal();
      if (typeof loadStudioHabits === 'function') {
        loadStudioHabits();
      } else if (typeof loadDashboard === 'function') {
        loadDashboard();
      } else {
        window.location.reload();
      }
    } else {
      alert('Failed to save habit: ' + (res.message || 'Error'));
    }
  } catch (err) {
    console.error('Error saving habit:', err);
  }
}

async function deleteStudioHabit(habitId, habitTitle) {
  if (!habitId) return;
  const name = habitTitle || 'this habit';
  if (confirm(`Are you sure you want to delete "${name}"? This will permanently remove the habit and all its logged records from the database.`)) {
    try {
      const res = await API.deleteHabit(habitId);
      if (res.success) {
        closeHabitModal();
        if (typeof loadStudioHabits === 'function') {
          loadStudioHabits();
        } else if (typeof loadDashboard === 'function') {
          loadDashboard();
        } else {
          window.location.reload();
        }
      } else {
        alert('Failed to delete habit: ' + (res.message || 'Error'));
      }
    } catch (err) {
      console.error('Error deleting habit:', err);
      alert('Error deleting habit from database.');
    }
  }
}

function handleModalDeleteClick() {
  if (currentEditingHabitId) {
    const title = document.getElementById('habitTitleInput').value.trim();
    deleteStudioHabit(currentEditingHabitId, title);
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
