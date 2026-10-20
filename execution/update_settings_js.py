with open('public/js/settings.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update initSettings
old_init = """function initSettings() {
  const currentTheme = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.getElementById('themeSelect').value = currentTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);

  const currentShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';
  document.getElementById('tileShapeSelect').value = currentShape;

  document.getElementById('soundToggle').checked = localStorage.getItem('habitkit_sound') !== 'false';
  document.getElementById('confettiToggle').checked = localStorage.getItem('habitkit_confetti') !== 'false';

  lucide.createIcons();
}"""

new_init = """function initSettings() {
  const currentTheme = localStorage.getItem('committed_theme') || localStorage.getItem('habitkit_theme') || 'dark';
  document.getElementById('themeSelect').value = currentTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (window.Utils && Utils.syncMobileThemeColor) {
    Utils.syncMobileThemeColor(currentTheme);
  }

  const currentShape = localStorage.getItem('habitkit_tile_shape') || 'tile-rounded';
  document.getElementById('tileShapeSelect').value = currentShape;

  document.getElementById('soundToggle').checked = localStorage.getItem('habitkit_sound') !== 'false';
  document.getElementById('confettiToggle').checked = localStorage.getItem('habitkit_confetti') !== 'false';

  const hapticsEl = document.getElementById('hapticsToggle');
  if (hapticsEl) {
    hapticsEl.checked = localStorage.getItem('habitkit_haptics') !== 'false';
  }

  lucide.createIcons();
}"""

# Update button sizes in renderCategoriesList
old_btn = """        <button class="btn btn-icon" onclick="openEditCategoryModal('${cat.id}')" title="Edit Category" style="width: 32px; height: 32px;">
          <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
        </button>
        <button class="btn btn-icon category-btn-delete" onclick="handleDeleteCategory('${cat.id}', '${escapeHtml(cat.name)}')" title="Delete Category" style="width: 32px; height: 32px;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>"""

new_btn = """        <button class="btn btn-icon" onclick="openEditCategoryModal('${cat.id}')" title="Edit Category" style="width: 40px; height: 40px; min-width: 44px; min-height: 44px;">
          <i data-lucide="edit-2" style="width: 15px; height: 15px;"></i>
        </button>
        <button class="btn btn-icon category-btn-delete" onclick="handleDeleteCategory('${cat.id}', '${escapeHtml(cat.name)}')" title="Delete Category" style="width: 40px; height: 40px; min-width: 44px; min-height: 44px;">
          <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
        </button>"""

# Update handleThemeChange and toggles
old_handlers = """function handleThemeChange(val) {
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
}"""

new_handlers = """function handleThemeChange(val) {
  document.documentElement.setAttribute('data-theme', val);
  localStorage.setItem('committed_theme', val);
  localStorage.setItem('habitkit_theme', val);
  if (window.Utils) {
    Utils.syncMobileThemeColor(val);
    Utils.showToast('Theme updated to ' + val, 'success');
  }
}

function handleTileShapeChange(val) {
  localStorage.setItem('habitkit_tile_shape', val);
  if (window.Utils) Utils.showToast('Tile shape updated', 'success');
}

function handleSoundToggle(e) {
  localStorage.setItem('habitkit_sound', e.target.checked);
  if (window.Utils) {
    if (e.target.checked) Utils.playSound('click');
    Utils.showToast('Audio feedback ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
  }
}

function handleConfettiToggle(e) {
  localStorage.setItem('habitkit_confetti', e.target.checked);
  if (window.Utils) Utils.showToast('Celebration confetti ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
}

function handleHapticsToggle(e) {
  localStorage.setItem('habitkit_haptics', e.target.checked);
  if (window.Utils) {
    if (e.target.checked) Utils.triggerHaptic('success');
    Utils.showToast('Haptic vibration ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
  }
}"""

c_norm = content.replace('\r\n', '\n')
c_norm = c_norm.replace(old_init.replace('\r\n', '\n'), new_init.replace('\r\n', '\n'))
c_norm = c_norm.replace(old_btn.replace('\r\n', '\n'), new_btn.replace('\r\n', '\n'))
c_norm = c_norm.replace(old_handlers.replace('\r\n', '\n'), new_handlers.replace('\r\n', '\n'))

with open('public/js/settings.js', 'w', encoding='utf-8') as f:
    f.write(c_norm)

print("SUCCESS: updated settings.js")
