// Committed Settings & Category Management Controller

const PALETTE_COLORS = [
  '#10B981', '#059669', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#6B7280'
];

let selectedCategoryColor = '#10B981';
let categoriesList = [];

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  loadCategories();
  renderCategoryPalette();
});

function initSettings() {
  const currentTheme = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.getElementById('themeSelect').value = currentTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);

  const currentShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';
  document.getElementById('tileShapeSelect').value = currentShape;

  document.getElementById('soundToggle').checked = localStorage.getItem('habitkit_sound') !== 'false';
  document.getElementById('confettiToggle').checked = localStorage.getItem('habitkit_confetti') !== 'false';

  lucide.createIcons();
}

async function loadCategories() {
  const container = document.getElementById('categoriesListContainer');
  if (!container) return;

  try {
    const res = await API.getCategories();
    if (!res.success || !res.categories) {
      container.innerHTML = `<div style="color: var(--accent-rose); font-size: 0.8rem; text-align: center; padding: 1rem;">Unable to load categories from Supabase.</div>`;
      return;
    }

    categoriesList = res.categories;
    renderCategoriesList(categoriesList);
  } catch (err) {
    console.error('Error loading categories:', err);
    container.innerHTML = `<div style="color: var(--accent-rose); font-size: 0.8rem; text-align: center; padding: 1rem;">Failed to load categories from Supabase: ${escapeHtml(err.message || 'Connection error')}</div>`;
  }
}

function renderCategoriesList(categories) {
  const container = document.getElementById('categoriesListContainer');
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 1rem;">No categories yet.</div>';
    return;
  }

  container.innerHTML = categories.map(cat => `
    <div class="category-item-row">
      <div class="category-item-left">
        <div class="category-color-dot" style="background-color: ${cat.color};"></div>
        <div>
          <div class="category-name-text">${escapeHtml(cat.name)}</div>
          <div class="category-count-badge">${cat.habitsCount || 0} habits</div>
        </div>
      </div>
      <div class="category-actions">
        <button class="btn btn-icon" onclick="openEditCategoryModal('${cat.id}')" title="Edit Category" style="width: 32px; height: 32px;">
          <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
        </button>
        <button class="btn btn-icon category-btn-delete" onclick="handleDeleteCategory('${cat.id}', '${escapeHtml(cat.name)}')" title="Delete Category" style="width: 32px; height: 32px;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

function renderCategoryPalette(currentEditId = null) {
  const grid = document.getElementById('catPaletteGrid');
  if (!grid) return;

  const usedColors = new Set(
    categoriesList
      .filter(c => !currentEditId || c.id !== currentEditId)
      .map(c => (c.color || '').toUpperCase())
  );

  grid.innerHTML = PALETTE_COLORS.map(color => {
    const isTaken = usedColors.has(color.toUpperCase());
    const isSelected = color.toUpperCase() === (selectedCategoryColor || '').toUpperCase();
    const opacityStyle = isTaken ? 'opacity: 0.35; filter: grayscale(0.5);' : '';
    const tooltipTitle = isTaken ? 'Color already assigned to another category' : 'Select color';

    return `
      <div 
        class="color-swatch ${isSelected ? 'selected' : ''}" 
        style="background-color: ${color}; ${opacityStyle} position: relative;"
        title="${tooltipTitle}"
        onclick="selectCatColor('${color}', this, ${isTaken})"
      >
        ${isSelected ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function selectCatColor(color, elem, isTaken = false) {
  if (isTaken) {
    alert('This color is already assigned to another category. Each category must have a unique color.');
    return;
  }
  selectedCategoryColor = color;
  document.querySelectorAll('#catPaletteGrid .color-swatch').forEach(s => {
    s.classList.remove('selected');
    s.innerHTML = '';
  });
  if (elem) {
    elem.classList.add('selected');
    elem.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
    lucide.createIcons();
  }
}

function openAddCategoryModal() {
  document.getElementById('catModalTitle').textContent = 'Add Category';
  document.getElementById('catEditId').value = '';
  document.getElementById('catNameInput').value = '';
  
  const usedColors = new Set(categoriesList.map(c => (c.color || '').toUpperCase()));
  const availableColor = PALETTE_COLORS.find(c => !usedColors.has(c.toUpperCase())) || PALETTE_COLORS[0];
  selectedCategoryColor = availableColor;
  
  renderCategoryPalette(null);
  document.getElementById('categoryModalOverlay').classList.add('open');
}

function openEditCategoryModal(catId) {
  const cat = categoriesList.find(c => c.id === catId);
  if (!cat) return;

  document.getElementById('catModalTitle').textContent = 'Edit Category';
  document.getElementById('catEditId').value = cat.id;
  document.getElementById('catNameInput').value = cat.name;
  selectedCategoryColor = cat.color || '#10B981';
  renderCategoryPalette(cat.id);
  document.getElementById('categoryModalOverlay').classList.add('open');
}

function closeCategoryModal() {
  document.getElementById('categoryModalOverlay').classList.remove('open');
}

async function saveCategoryForm(e) {
  e.preventDefault();
  const id = document.getElementById('catEditId').value;
  const name = document.getElementById('catNameInput').value.trim();

  if (!name) return;

  const usedByOther = categoriesList.find(c => (!id || c.id !== id) && (c.color || '').toUpperCase() === selectedCategoryColor.toUpperCase());
  if (usedByOther) {
    alert(`The color ${selectedCategoryColor} is already assigned to "${usedByOther.name}". Please pick a unique color.`);
    return;
  }

  try {
    if (id) {
      // Edit
      const res = await API.updateCategory(id, { name, color: selectedCategoryColor });
      if (res.success) {
        closeCategoryModal();
        await loadCategories();
      } else {
        alert(res.message || 'Failed to update category');
      }
    } else {
      // Create
      const res = await API.createCategory({ name, color: selectedCategoryColor });
      if (res.success) {
        closeCategoryModal();
        await loadCategories();
      } else {
        alert(res.message || 'Failed to create category');
      }
    }
  } catch (err) {
    console.error('Error saving category:', err);
  }
}

async function handleDeleteCategory(id, name) {
  if (confirm(`Are you sure you want to delete category "${name}"? Any habits in this category will be safely reassigned to General.`)) {
    try {
      const res = await API.deleteCategory(id);
      if (res.success) {
        await loadCategories();
      } else {
        alert(res.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  }
}

function handleThemeChange(val) {
  document.documentElement.setAttribute('data-theme', val);
  localStorage.setItem('committed_theme' || localStorage.getItem('habitkit_theme'), val);
}

function handleTileShapeChange(val) {
  localStorage.setItem('habitkit_tile_shape', val);
}

function handleSoundToggle(e) {
  localStorage.setItem('habitkit_sound', e.target.checked);
}

function handleConfettiToggle(e) {
  localStorage.setItem('habitkit_confetti', e.target.checked);
}

function triggerExport() {
  API.exportBackup();
}

async function triggerImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      const res = await API.importBackup(data);
      if (res.success) {
        alert('Data imported successfully!');
        window.location.reload();
      } else {
        alert('Failed to import: ' + res.error);
      }
    } catch (err) {
      alert('Invalid JSON file format.');
    }
  };
  reader.readAsText(file);
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
