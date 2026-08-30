// Committed Multi-Year Progression & Mastery Controller

let progressionData = null;
let currentModalCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadProgressData();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

async function loadProgressData() {
  try {
    const res = await API.getProgression();
    if (!res.success) return;

    progressionData = res;
    renderHeroCard(res);
    renderLifetimeStats(res.lifetimeStats);
    renderAchievedBadges();

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading progress data:', err);
  }
}

function renderHeroCard(data) {
  document.getElementById('heroLevelNum').textContent = `LEVEL ${data.level}`;
  document.getElementById('heroXpFill').style.width = `${data.progressPercent}%`;
  document.getElementById('heroXpCurrentText').textContent = `${(data.currentLevelXP || 0).toLocaleString()} / ${(data.nextLevelTargetXP || 100).toLocaleString()} XP`;
  document.getElementById('heroXpRemainingText').textContent = `${(data.xpRemaining || 0).toLocaleString()} XP until Level ${data.level + 1}`;
}

function renderLifetimeStats(stats) {
  if (!stats) return;
  document.getElementById('statLifetimeXP').textContent = (stats.lifetimeXP || 0).toLocaleString();
  document.getElementById('statTotalCompletions').textContent = (stats.totalCompletions || 0).toLocaleString();
  document.getElementById('statPerfectDays').textContent = stats.perfectDays || 0;
  document.getElementById('statBestStreak').textContent = `${stats.longestStreak || 0}d`;
}

const CATEGORY_META = {
  streak: { color: '#f59e0b', name: 'Streak Milestone', bg: 'rgba(245, 158, 11, 0.15)' },
  perfect_days: { color: '#8b5cf6', name: 'Perfect Day Mastery', bg: 'rgba(139, 92, 246, 0.15)' },
  consistency: { color: '#10b981', name: 'Consistency Pillar', bg: 'rgba(16, 185, 129, 0.15)' },
  volume: { color: '#06b6d4', name: 'Volume Legend', bg: 'rgba(6, 182, 212, 0.15)' }
};

function renderAchievedBadges() {
  if (!progressionData || !progressionData.achievements) return;
  const container = document.getElementById('achievedBadgesContainer');
  const countLabel = document.getElementById('achievementsCountText');

  const all = progressionData.achievements;
  const achieved = all.filter(a => a.unlocked);

  if (countLabel) {
    countLabel.textContent = `${achieved.length} / ${all.length} Badges Earned`;
  }

  if (achieved.length === 0) {
    container.innerHTML = `
      <div class="achieved-empty-state animate-fade-in">
        <div class="achieved-empty-icon">
          <i data-lucide="sparkles" style="width: 26px; height: 26px;"></i>
        </div>
        <div class="achieved-empty-title">No Milestones Unlocked Yet</div>
        <div class="achieved-empty-desc">Complete habit streaks and perfect days to unlock your first milestone badge!</div>
        <button class="btn btn-secondary" onclick="openAllBadgesModal()" style="margin-top: 0.85rem; font-size: 0.78rem; padding: 0.4rem 0.85rem;">
          <i data-lucide="trophy" style="width: 14px; height: 14px;"></i>
          <span>View Available Badges</span>
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="achieved-badges-grid animate-fade-in">
      ${achieved.map(b => {
        const meta = CATEGORY_META[b.category] || CATEGORY_META.streak;
        return `
          <div 
            class="achieved-badge-item"
            style="--badge-accent: ${meta.color}; --badge-bg: ${meta.bg};"
            data-badge-title="${escapeHtml(b.name)}"
            data-badge-desc="${escapeHtml(b.description)}"
            data-badge-xp="+${b.xpBonus} XP"
            data-badge-cat="${meta.name}"
          >
            <div class="achieved-badge-icon">
              <i data-lucide="${b.icon || 'trophy'}" style="width: 18px; height: 18px;"></i>
            </div>
            <div class="achieved-badge-check">
              <i data-lucide="check" style="width: 9px; height: 9px; stroke-width: 3.5;"></i>
            </div>
            <span class="achieved-badge-label">${escapeHtml(b.name)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  lucide.createIcons();
  initBadgeHoverTooltips();
}

function initBadgeHoverTooltips() {
  let tooltipEl = document.getElementById('badgeDetailTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'badgeDetailTooltip';
    tooltipEl.className = 'badge-hover-tooltip';
    document.body.appendChild(tooltipEl);
  }

  const showTooltip = (badgeEl) => {
    const title = badgeEl.dataset.badgeTitle;
    const desc = badgeEl.dataset.badgeDesc;
    const xp = badgeEl.dataset.badgeXp;
    const cat = badgeEl.dataset.badgeCat;

    tooltipEl.innerHTML = `
      <div class="badge-tt-header">
        <span class="badge-tt-tag">✓ Milestone Completed</span>
        <span class="badge-tt-xp">${xp}</span>
      </div>
      <div class="badge-tt-title">${title}</div>
      <div class="badge-tt-desc">${desc}</div>
      <div class="badge-tt-cat">${cat}</div>
    `;

    const rect = badgeEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 10;

    tooltipEl.style.left = `${centerX}px`;

    if (topY < 90) {
      tooltipEl.style.top = `${rect.bottom + 10}px`;
      tooltipEl.classList.add('flipped');
    } else {
      tooltipEl.style.top = `${topY}px`;
      tooltipEl.classList.remove('flipped');
    }

    tooltipEl.classList.add('visible');
  };

  const hideTooltip = () => {
    tooltipEl.classList.remove('visible');
  };

  document.querySelectorAll('.achieved-badge-item').forEach(el => {
    el.removeEventListener('mouseenter', el._hoverIn);
    el.removeEventListener('mouseleave', el._hoverOut);

    el._hoverIn = () => showTooltip(el);
    el._hoverOut = () => hideTooltip();

    el.addEventListener('mouseenter', el._hoverIn);
    el.addEventListener('mouseleave', el._hoverOut);
  });
}

// ------------------------------------------------------------------------------
// Modal Logic: All Badges & Progress
// ------------------------------------------------------------------------------
function openAllBadgesModal() {
  if (!progressionData) return;
  const overlay = document.getElementById('allBadgesModalOverlay');
  if (!overlay) return;

  const all = progressionData.achievements || [];
  const unlockedCount = all.filter(a => a.unlocked).length;
  const summaryText = document.getElementById('modalBadgesSummaryText');
  if (summaryText) {
    summaryText.textContent = `${unlockedCount} of ${all.length} Badges Unlocked`;
  }

  currentModalCategory = 'all';
  document.querySelectorAll('.all-badges-modal .achieve-tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === 0);
  });

  renderModalBadgesGrid();
  overlay.classList.add('open');
  lucide.createIcons();
}

function closeAllBadgesModal() {
  const overlay = document.getElementById('allBadgesModalOverlay');
  if (overlay) overlay.classList.remove('open');
}

function setModalCategoryFilter(category, btn) {
  currentModalCategory = category;
  document.querySelectorAll('.all-badges-modal .achieve-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderModalBadgesGrid();
  lucide.createIcons();
}

function renderModalBadgesGrid() {
  if (!progressionData || !progressionData.achievements) return;
  const container = document.getElementById('modalBadgesGrid');
  if (!container) return;

  let list = progressionData.achievements;
  if (currentModalCategory !== 'all') {
    list = list.filter(a => a.category === currentModalCategory);
  }

  container.innerHTML = list.map(a => {
    const meta = CATEGORY_META[a.category] || CATEGORY_META.streak;
    const color = meta.color;
    const percent = Math.min(100, Math.round((a.current / a.target) * 100));

    return `
      <div class="modal-badge-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="modal-badge-card-top">
          <div class="modal-badge-icon" style="background: ${color}20; color: ${color};">
            <i data-lucide="${a.icon || 'trophy'}" style="width: 17px; height: 17px;"></i>
          </div>
          <div class="modal-badge-status-pill ${a.unlocked ? 'unlocked' : 'locked'}">
            ${a.unlocked ? '<i data-lucide="check" style="width: 11px; height: 11px;"></i> Unlocked' : `+${a.xpBonus} XP`}
          </div>
        </div>

        <div class="modal-badge-title">${escapeHtml(a.name)}</div>
        <div class="modal-badge-desc">${escapeHtml(a.description)}</div>

        <div class="modal-badge-progress-box">
          <div class="modal-badge-progress-labels">
            <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-muted)'}; font-weight: 750;">
              ${a.unlocked ? 'Milestone Complete' : 'Progress'}
            </span>
            <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-primary)'}; font-weight: 850;">
              ${a.current.toLocaleString()}${a.unit || ''} / ${a.target.toLocaleString()}${a.unit || ''} (${percent}%)
            </span>
          </div>
          <div class="modal-badge-progress-track">
            <div class="modal-badge-progress-fill" style="width: ${percent}%; background: ${a.unlocked ? '#10b981' : color};"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
