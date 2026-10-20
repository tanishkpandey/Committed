// Committed Habit Creation & Editing Modal Controller

let currentEditingHabitId = null;
let modalSelectedColor = '#10B981';
let modalSelectedIcon = 'zap';

const MODAL_COLORS = [
  '#10B981', '#059669', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#6B7280'
];

const MODAL_ICONS = [
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

    modalSelectedColor = habit.color || '#10B981';
    modalSelectedIcon = habit.icon || 'zap';

    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  } else {
    currentEditingHabitId = null;
    if (modalTitle) modalTitle.textContent = 'Create Habit';
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (freqSelect) freqSelect.value = '7';
    if (gridSelect) gridSelect.value = '60';

    modalSelectedColor = '#10B981';
    modalSelectedIcon = 'zap';

    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  renderModalPalette();
  renderModalIconPicker();

  const overlay = document.getElementById('habitModalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    if (window.UI && UI.lockBodyScroll) UI.lockBodyScroll();
    if (!overlay.dataset.backdropBound) {
      overlay.dataset.backdropBound = 'true';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeHabitModal();
      });
    }
  }
}

function closeHabitModal() {
  const overlay = document.getElementById('habitModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    if (window.UI && UI.unlockBodyScroll) UI.unlockBodyScroll();
  }
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

function renderModalPalette() {
  const container = document.getElementById('paletteGrid');
  if (!container) return;

  container.innerHTML = MODAL_COLORS.map(color => `
    <div 
      class="color-swatch ${color === modalSelectedColor ? 'selected' : ''}" 
      style="background-color: ${color};"
      onclick="selectModalColor('${color}', this)"
    >
      ${color === modalSelectedColor ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function selectModalColor(color, elem) {
  modalSelectedColor = color;
  document.querySelectorAll('#paletteGrid .color-swatch').forEach(s => {
    s.classList.remove('selected');
    s.innerHTML = '';
  });
  if (elem) {
    elem.classList.add('selected');
    elem.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
    if (window.lucide) lucide.createIcons();
  }
}

function renderModalIconPicker() {
  const container = document.getElementById('iconPickerGrid');
  if (!container) return;

  container.innerHTML = MODAL_ICONS.map(iconName => `
    <div 
      class="icon-choice ${iconName === modalSelectedIcon ? 'selected' : ''}"
      onclick="selectModalIcon('${iconName}', this)"
    >
      <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function selectModalIcon(iconName, elem) {
  modalSelectedIcon = iconName;
  document.querySelectorAll('#iconPickerGrid .icon-choice').forEach(i => i.classList.remove('selected'));
  if (elem) elem.classList.add('selected');
}

// Aliases for compatibility
const renderStudioPalette = renderModalPalette;
const selectStudioColor = selectModalColor;
const renderStudioIconPicker = renderModalIconPicker;
const selectStudioIcon = selectModalIcon;

async function saveHabitForm(e) {
  e.preventDefault();

  // Strict Online Guard: Prevent offline habit creation/modification
  if (window.OnlineGuard && (!window.OnlineGuard.isOnline || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    window.OnlineGuard.show('An active internet connection is required to create or modify habits.');
    return;
  }

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
    color: modalSelectedColor,
    icon: modalSelectedIcon
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
      if (window.Utils) {
        Utils.triggerHaptic('success');
        Utils.showToast(currentEditingHabitId ? 'Habit updated successfully' : 'New habit created!', 'success');
      }
      if (typeof loadTodayData === 'function') {
        loadTodayData();
      } else if (typeof loadDashboard === 'function') {
        loadDashboard();
      } else {
        window.location.reload();
      }
    } else {
      if (window.Utils) {
        Utils.showToast(res.message || 'Failed to save habit', 'danger');
      } else {
        alert('Failed to save habit: ' + (res.message || 'Error'));
      }
    }
  } catch (err) {
    console.error('Error saving habit:', err);
    if (window.Utils) Utils.showToast('Network error saving habit', 'danger');
    if (window.OnlineGuard) window.OnlineGuard.show('Unable to save habit. Cloud connection was lost.');
  }
}

async function deleteHabitAction(habitId, habitTitle) {
  if (!habitId) return;

  // Strict Online Guard: Prevent offline deletion
  if (window.OnlineGuard && (!window.OnlineGuard.isOnline || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    window.OnlineGuard.show('An active internet connection is required to delete habits.');
    return;
  }

  const name = habitTitle || 'this habit';
  if (confirm(`Are you sure you want to delete "${name}"? This will permanently remove the habit and all its logged records.`)) {
    try {
      const res = await API.deleteHabit(habitId);
      if (res.success) {
        closeHabitModal();
        if (window.Utils) {
          Utils.triggerHaptic('medium');
          Utils.showToast('Habit deleted', 'info');
        }
        if (typeof loadTodayData === 'function') {
          loadTodayData();
        } else if (typeof loadDashboard === 'function') {
          loadDashboard();
        } else {
          window.location.reload();
        }
      } else {
        if (window.Utils) {
          Utils.showToast(res.message || 'Failed to delete habit', 'danger');
        } else {
          alert('Failed to delete habit: ' + (res.message || 'Error'));
        }
      }
    } catch (err) {
      console.error('Error deleting habit:', err);
      if (window.Utils) Utils.showToast('Error deleting habit', 'danger');
    }
  }
}

function handleModalDeleteClick() {
  if (currentEditingHabitId) {
    const title = document.getElementById('habitTitleInput').value.trim();
    deleteHabitAction(currentEditingHabitId, title);
  }
}

function updateLivePreview() {}
