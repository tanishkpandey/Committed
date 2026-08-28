// Committed Multi-Year Progression & Mastery Controller (Harmonized with Insights)

let progressionData = null;
let currentCategoryFilter = 'all';
let showAchievedOnly = false;

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
    renderAchievements();
    renderXPFeed(res.recentTransactions);

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

function setCategoryFilter(category, btn) {
  currentCategoryFilter = category;
  document.querySelectorAll('.achieve-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAchievements();
  lucide.createIcons();
}

function toggleAchievedFilter() {
  showAchievedOnly = !showAchievedOnly;
  const btn = document.getElementById('btnToggleAchieved');
  if (btn) {
    btn.innerHTML = showAchievedOnly
      ? `<i data-lucide="eye-off" style="width: 13px; height: 13px;"></i> <span>Show All</span>`
      : `<i data-lucide="eye" style="width: 13px; height: 13px;"></i> <span>Show Achieved</span>`;
  }
  renderAchievements();
  lucide.createIcons();
}

const CATEGORY_COLORS = {
  streak: '#f59e0b',
  perfect_days: '#8b5cf6',
  consistency: '#10b981',
  volume: '#06b6d4'
};

function renderAchievements() {
  if (!progressionData || !progressionData.achievements) return;
  const container = document.getElementById('achievementsContainer');
  const countLabel = document.getElementById('achievementsCountText');

  const all = progressionData.achievements;
  const unlockedCount = all.filter(a => a.unlocked).length;

  if (countLabel) {
    countLabel.textContent = `${unlockedCount} / ${all.length} Unlocked`;
  }

  let filtered = all;
  if (currentCategoryFilter !== 'all') {
    filtered = filtered.filter(a => a.category === currentCategoryFilter);
  }
  if (showAchievedOnly) {
    filtered = filtered.filter(a => a.unlocked);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
        No milestones in this filter view.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(a => {
    const color = CATEGORY_COLORS[a.category] || '#10b981';
    const percent = Math.min(100, Math.round((a.current / a.target) * 100));

    return `
      <div class="achieve-card-item ${a.unlocked ? 'unlocked' : ''} animate-fade-in">
        <div>
          <div class="achieve-card-top">
            <div class="achieve-card-icon" style="background: ${color}20; color: ${color};">
              <i data-lucide="${a.icon || 'trophy'}" style="width: 15px; height: 15px;"></i>
            </div>
            <div class="achieve-card-reward ${a.unlocked ? 'unlocked' : 'locked'}">
              ${a.unlocked ? '✓ Done' : `+${a.xpBonus} XP`}
            </div>
          </div>
          <div class="achieve-card-title" title="${a.name}">${a.name}</div>
          <div class="achieve-card-desc" title="${a.description}">${a.description}</div>
        </div>

        <div>
          <div class="achieve-card-prog-meta">
            <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-muted)'}; font-weight: 750;">${a.unlocked ? 'Complete' : 'Progress'}</span>
            <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-primary)'}; font-weight: 800;">${a.current.toLocaleString()}${a.unit || ''}/${a.target.toLocaleString()}${a.unit || ''}</span>
          </div>
          <div class="achieve-card-prog-track">
            <div class="achieve-card-prog-fill" style="width: ${percent}%; background: ${a.unlocked ? '#10b981' : color};"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderXPFeed(transactions) {
  const container = document.getElementById('xpFeedList');
  if (!container) return;

  const last10 = (transactions || []).slice(0, 10);

  if (last10.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">No XP transactions yet.</div>';
    return;
  }

  container.innerHTML = last10.map(t => `
    <div class="insight-card-item animate-fade-in" style="margin-bottom: 0.55rem; padding: 0.75rem 0.95rem;">
      <div class="insight-card-left">
        <div class="insight-icon-box" style="background-color: rgba(16, 185, 129, 0.15); color: #10b981; width: 34px; height: 34px;">
          <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
        </div>
        <div>
          <div class="insight-title-line" style="font-size: 0.82rem;">${t.description}</div>
          <div class="insight-message-text" style="font-size: 0.7rem;">${t.event_date || 'Recent'}</div>
        </div>
      </div>
      <div class="insight-stat-badge" style="min-width: 60px; padding: 0.35rem 0.6rem; border-color: rgba(16, 185, 129, 0.3);">
        <div class="insight-stat-val" style="color: #10b981; font-size: 0.9rem;">+${t.amount}</div>
        <div class="insight-stat-sub">XP</div>
      </div>
    </div>
  `).join('');
}
