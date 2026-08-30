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
  streak: { color: '#8b5cf6', name: 'Streaks', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbon: '#927FF2', ribbonShadow: '#6352B9' },
  perfect_days: { color: '#f59e0b', name: 'Perfect Days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbon: '#FFD36A', ribbonShadow: '#B87912' },
  consistency: { color: '#10b981', name: 'Consistency', top: 'url(#consistencyTop)', bottom: 'url(#consistencyBottom)', ribbon: '#6DD9C1', ribbonShadow: '#438F82' },
  volume: { color: '#06b6d4', name: 'Volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbon: '#65B9E8', ribbonShadow: '#397EA9' }
};

// 24 Badges Catalog matching SVG Template Specs
const BADGE_CATALOG = {
  // STREAKS
  streak_7: { displayNum: '7', unitText: 'DAYS', ribbon: 'none', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#927FF2', ribbonShadow: '#6352B9', title: 'Week Warrior' },
  streak_21: { displayNum: '21', unitText: 'DAYS', ribbon: 'ribbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#927FF2', ribbonShadow: '#6352B9', title: 'Habit Lock' },
  streak_30: { displayNum: '30', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#927FF2', ribbonShadow: '#6352B9', title: 'Month of Iron' },
  streak_50: { displayNum: '50', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#927FF2', ribbonShadow: '#6352B9', title: '50-Day Momentum' },
  streak_100: { displayNum: '100', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#927FF2', ribbonShadow: '#6352B9', title: 'Century' },
  streak_180: { displayNum: '180', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#A48FF7', ribbonShadow: '#6352B9', title: 'Half-Year Titan' },
  streak_365: { displayNum: '365', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#A48FF7', ribbonShadow: '#6352B9', title: 'Unstoppable' },
  streak_730: { displayNum: '730', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', top: 'url(#streakTop)', bottom: 'url(#streakBottom)', ribbonColor: '#B09EFF', ribbonShadow: '#6352B9', title: 'Grandmaster' },

  // PERFECT DAYS
  pd_1: { displayNum: '1', unitText: 'PERFECT DAY', ribbon: 'none', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFD36A', ribbonShadow: '#B87912', title: 'First Perfection' },
  pd_7: { displayNum: '7', unitText: 'PERFECT DAYS', ribbon: 'ribbon', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFD36A', ribbonShadow: '#B87912', title: 'Flawless Week' },
  pd_30: { displayNum: '30', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFD36A', ribbonShadow: '#B87912', title: 'Month of Perfection' },
  pd_100: { displayNum: '100', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFD36A', ribbonShadow: '#B87912', title: 'Centurion' },
  pd_365: { displayNum: '365', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFD36A', ribbonShadow: '#B87912', title: 'Year of Perfection' },
  pd_500: { displayNum: '500', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', top: 'url(#perfectTop)', bottom: 'url(#perfectBottom)', ribbonColor: '#FFE18B', ribbonShadow: '#B87912', title: 'Legendary' },

  // CONSISTENCY
  rate_m70: { displayNum: '70%', unitText: 'MONTHLY', ribbon: 'none', category: 'consistency', top: 'url(#consistencyTop)', bottom: 'url(#consistencyBottom)', ribbonColor: '#6DD9C1', ribbonShadow: '#438F82', title: 'Consistent Builder' },
  rate_m80: { displayNum: '80%', unitText: 'MONTHLY', ribbon: 'ribbon', category: 'consistency', top: 'url(#consistencyTop)', bottom: 'url(#consistencyBottom)', ribbonColor: '#6DD9C1', ribbonShadow: '#438F82', title: 'High Achiever' },
  rate_m90: { displayNum: '90%', unitText: 'MONTHLY', ribbon: 'starRibbon', category: 'consistency', top: 'url(#consistencyTop)', bottom: 'url(#consistencyBottom)', ribbonColor: '#6DD9C1', ribbonShadow: '#438F82', title: 'Elite Month' },
  rate_y80: { displayNum: '80%', unitText: 'FULL YEAR', ribbon: 'starRibbon', category: 'consistency', top: 'url(#consistencyTop)', bottom: 'url(#consistencyBottom)', ribbonColor: '#8BE5D1', ribbonShadow: '#438F82', title: 'Year of Excellence' },

  // VOLUME
  vol_100: { displayNum: '100', unitText: 'CHECK-INS', ribbon: 'none', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#65B9E8', ribbonShadow: '#397EA9', title: 'Century Club' },
  vol_500: { displayNum: '500', unitText: 'CHECK-INS', ribbon: 'ribbon', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#65B9E8', ribbonShadow: '#397EA9', title: '500 Club' },
  vol_1000: { displayNum: '1K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#65B9E8', ribbonShadow: '#397EA9', title: 'Kilo' },
  vol_2500: { displayNum: '2.5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#65B9E8', ribbonShadow: '#397EA9', title: 'Marathon' },
  vol_5000: { displayNum: '5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#65B9E8', ribbonShadow: '#397EA9', title: 'Grandmaster' },
  vol_10000: { displayNum: '10K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', top: 'url(#volumeTop)', bottom: 'url(#volumeBottom)', ribbonColor: '#83D0F3', ribbonShadow: '#397EA9', title: 'Hall of Fame' }
};

function generateBadgeSVG(badgeId, unlocked = true) {
  const conf = BADGE_CATALOG[badgeId] || BADGE_CATALOG.streak_7;
  const uid = 'b_' + badgeId.replace(/[^a-zA-Z0-9_]/g, '_') + (unlocked ? '_u' : '_l');

  const numStr = String(conf.displayNum);
  let numClass = 'badge-svg-number';
  if (numStr.length >= 4) {
    numClass = 'badge-svg-number badge-svg-number-xs';
  } else if (numStr.length >= 3) {
    numClass = 'badge-svg-number badge-svg-number-small';
  }

  const yNum = conf.ribbon === 'none' ? 36 : (conf.category === 'volume' ? 44 : 40);
  const yUnit = conf.ribbon === 'none' ? 72 : 75;

  let topC1, topC2, botC1, botC2, ribColor, ribShadow;
  if (!unlocked) {
    topC1 = '#2c3038'; topC2 = '#3d4450';
    botC1 = '#4b5563'; botC2 = '#1f242d';
    ribColor = '#4b5563'; ribShadow = '#1f242d';
  } else if (conf.category === 'streak') {
    topC1 = '#40318F'; topC2 = '#6752D6';
    botC1 = '#806BE7'; botC2 = '#342779';
    ribColor = conf.ribbonColor || '#927FF2';
    ribShadow = conf.ribbonShadow || '#6352B9';
  } else if (conf.category === 'perfect_days') {
    topC1 = '#C78312'; topC2 = '#F3B52E';
    botC1 = '#FFD66B'; botC2 = '#D99217';
    ribColor = conf.ribbonColor || '#FFD36A';
    ribShadow = conf.ribbonShadow || '#B87912';
  } else if (conf.category === 'consistency') {
    topC1 = '#176A61'; topC2 = '#2D9A89';
    botC1 = '#55C7B0'; botC2 = '#1C7065';
    ribColor = conf.ribbonColor || '#6DD9C1';
    ribShadow = conf.ribbonShadow || '#438F82';
  } else {
    topC1 = '#164B78'; topC2 = '#247DB5';
    botC1 = '#5DB8E8'; botC2 = '#1C5D89';
    ribColor = conf.ribbonColor || '#65B9E8';
    ribShadow = conf.ribbonShadow || '#397EA9';
  }

  const hexD = "M 38,0 L 92,0 Q 98,0 101,6 L 124,49 Q 127,55 124,61 L 101,104 Q 98,110 92,110 L 38,110 Q 32,110 29,104 L 6,61 Q 3,55 6,49 L 29,6 Q 32,0 38,0 Z";

  let ribbonMarkup = '';
  if (conf.ribbon === 'ribbon' || conf.ribbon === 'starRibbon') {
    const starMarkup = conf.ribbon === 'starRibbon' ? `
      <path d="M18,37 L20,42 L25,42 L21,45 L23,50 L18,47 L13,50 L15,45 L11,42 L16,42 Z" fill="#FFFFFF"/>
      <path d="M112,37 L114,42 L119,42 L115,45 L117,50 L112,47 L107,50 L109,45 L105,42 L110,42 Z" fill="#FFFFFF"/>
    ` : '';

    ribbonMarkup = `
      <path d="M15 44 L-30 44 L-15 59 L-30 74 L15 74 Z" fill="${ribShadow}"/>
      <path d="M-15 59 L15 74 L15 59 Z" fill="#000000" fill-opacity="0.25"/>
      <path d="M115 44 L160 44 L145 59 L160 74 L115 74 Z" fill="${ribShadow}"/>
      <path d="M145 59 L115 74 L115 59 Z" fill="#000000" fill-opacity="0.25"/>
      <path d="M-15 29 Q65 14 145 29 L145 59 Q65 44 -15 59 Z" fill="${ribColor}" filter="url(#ribbonShad_${uid})"/>
      ${starMarkup}
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-35 -5 200 125" class="milestone-badge-svg ${unlocked ? 'unlocked' : 'locked'}">
      <defs>
        <linearGradient id="top_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${topC1}"/>
          <stop offset="100%" stop-color="${topC2}"/>
        </linearGradient>
        <linearGradient id="bot_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${botC1}"/>
          <stop offset="100%" stop-color="${botC2}"/>
        </linearGradient>
        <clipPath id="clip_${uid}">
          <path d="${hexD}"/>
        </clipPath>
        <filter id="badgeShad_${uid}" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
        <filter id="ribbonShad_${uid}" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>

      <!-- Base Hexagon -->
      <g filter="url(#badgeShad_${uid})">
        <path d="${hexD}" fill="url(#top_${uid})"/>
        <g clip-path="url(#clip_${uid})">
          <path d="M0 58 Q65 43 130 58 L130 115 L0 115 Z" fill="url(#bot_${uid})"/>
        </g>
      </g>

      <!-- Top Highlight Arc -->
      <path d="M30 7 Q65 -1 100 7" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2.2"/>

      <!-- Ribbon -->
      ${ribbonMarkup}

      <!-- Badge Text -->
      <text x="65" y="${yNum}" class="${numClass}">${conf.displayNum}</text>
      <text x="65" y="${yUnit}" class="badge-svg-unit">${conf.unitText}</text>
    </svg>
  `;
}

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
        const catMeta = CATEGORY_META[b.category] || CATEGORY_META.streak;
        const svgMarkup = generateBadgeSVG(b.id, true);

        return `
          <div 
            class="achieved-badge-card"
            data-badge-title="${escapeHtml(b.name)}"
            data-badge-desc="${escapeHtml(b.description)}"
            data-badge-xp="+${b.xpBonus} XP"
            data-badge-cat="${catMeta.name}"
          >
            <div class="achieved-badge-graphic">
              ${svgMarkup}
            </div>
            <div class="achieved-badge-card-name" title="${escapeHtml(b.name)}">
              ${escapeHtml(b.name)}
            </div>
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

  let badgeTooltipTimer = null;

  const hideTooltip = () => {
    if (badgeTooltipTimer) {
      clearTimeout(badgeTooltipTimer);
      badgeTooltipTimer = null;
    }
    tooltipEl.classList.remove('visible');
  };

  const showTooltip = (badgeEl) => {
    hideTooltip();

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

    // Auto-hide after 1 second (1000ms)
    badgeTooltipTimer = setTimeout(() => {
      tooltipEl.classList.remove('visible');
      badgeTooltipTimer = null;
    }, 1000);
  };

  document.querySelectorAll('.achieved-badge-card').forEach(el => {
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
    const catMeta = CATEGORY_META[a.category] || CATEGORY_META.streak;
    const percent = Math.min(100, Math.round((a.current / a.target) * 100));
    const svgMarkup = generateBadgeSVG(a.id, a.unlocked);

    return `
      <div class="modal-badge-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="modal-badge-card-layout">
          <div class="modal-badge-svg-col">
            ${svgMarkup}
          </div>
          
          <div class="modal-badge-content-col">
            <div class="modal-badge-card-top">
              <span class="modal-badge-cat-tag" style="color: ${catMeta.color};">${catMeta.name}</span>
              <div class="modal-badge-status-pill ${a.unlocked ? 'unlocked' : 'locked'}">
                ${a.unlocked ? '<i data-lucide="check" style="width: 10px; height: 10px; stroke-width: 3;"></i> Unlocked' : `+${a.xpBonus} XP`}
              </div>
            </div>

            <div class="modal-badge-title">${escapeHtml(a.name)}</div>
            <div class="modal-badge-desc">${escapeHtml(a.description)}</div>

            <div class="modal-badge-progress-box">
              <div class="modal-badge-progress-labels">
                <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-muted)'}; font-weight: 750;">
                  ${a.unlocked ? 'Completed' : 'Progress'}
                </span>
                <span style="color: ${a.unlocked ? '#10b981' : 'var(--text-primary)'}; font-weight: 850;">
                  ${a.current.toLocaleString()}${a.unit || ''} / ${a.target.toLocaleString()}${a.unit || ''} (${percent}%)
                </span>
              </div>
              <div class="modal-badge-progress-track">
                <div class="modal-badge-progress-fill" style="width: ${percent}%; background: ${a.unlocked ? '#10b981' : catMeta.color};"></div>
              </div>
            </div>
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
