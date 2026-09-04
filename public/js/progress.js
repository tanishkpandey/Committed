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
    const container = document.querySelector('.app-container') || document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i>
        <span>Unable to fetch progression data from Supabase: ${escapeHtml(err.message || 'Connection error')}</span>
      </div>
      <button class="btn btn-secondary" onclick="loadProgressData()" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Retry</button>
    `;
    container.insertBefore(banner, container.firstChild);
    lucide.createIcons();
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
  streak: {
    color: '#8B5CF6',
    name: 'Streaks',
    glow: 'rgba(139, 92, 246, 0.22)',
    top: '#241C4A',
    topLight: '#49359A',
    bottom: '#6D5BC7',
    bottomDark: '#30245F',
    ribbon: '#806EE0',
    ribbonShadow: '#4B3D91'
  },

  perfect_days: {
    color: '#F59E0B',
    name: 'Perfect Days',
    glow: 'rgba(245, 158, 11, 0.20)',
    top: '#49330F',
    topLight: '#8B6218',
    bottom: '#C28A24',
    bottomDark: '#65430D',
    ribbon: '#D7A83F',
    ribbonShadow: '#765716'
  },

  consistency: {
    color: '#10B981',
    name: 'Consistency',
    glow: 'rgba(16, 185, 129, 0.20)',
    top: '#123A35',
    topLight: '#1F7668',
    bottom: '#3DAF9B',
    bottomDark: '#164E47',
    ribbon: '#58C6B0',
    ribbonShadow: '#347D70'
  },

  volume: {
    color: '#06B6D4',
    name: 'Volume',
    glow: 'rgba(6, 182, 212, 0.20)',
    top: '#103B49',
    topLight: '#176E87',
    bottom: '#3C9FC0',
    bottomDark: '#154E63',
    ribbon: '#5BB6D5',
    ribbonShadow: '#347A96'
  }
};

// 24 Badges Catalog matching SVG Template Specs
const BADGE_CATALOG = {
  // STREAKS
  streak_7: { displayNum: '7', unitText: 'DAYS', ribbon: 'none', category: 'streak', title: '7-Day Streak' },
  streak_21: { displayNum: '21', unitText: 'DAYS', ribbon: 'ribbon', category: 'streak', title: '21-Day Streak' },
  streak_30: { displayNum: '30', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '30-Day Streak' },
  streak_50: { displayNum: '50', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '50-Day Streak' },
  streak_100: { displayNum: '100', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '100-Day Streak' },
  streak_180: { displayNum: '180', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '180-Day Streak' },
  streak_365: { displayNum: '365', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '365-Day Streak' },
  streak_730: { displayNum: '730', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '730-Day Streak' },

  // PERFECT DAYS
  pd_1: { displayNum: '1', unitText: 'PERFECT DAY', ribbon: 'none', category: 'perfect_days', title: 'First Perfect Day' },
  pd_7: { displayNum: '7', unitText: 'PERFECT DAYS', ribbon: 'ribbon', category: 'perfect_days', title: 'Perfect Week' },
  pd_30: { displayNum: '30', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect Month' },
  pd_100: { displayNum: '100', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '100 Perfect Days' },
  pd_365: { displayNum: '365', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect Year' },
  pd_500: { displayNum: '500', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '500 Perfect Days' },

  // CONSISTENCY
  rate_m70: { displayNum: '70%', unitText: 'MONTHLY', ribbon: 'none', category: 'consistency', title: '70% Monthly' },
  rate_m80: { displayNum: '80%', unitText: 'MONTHLY', ribbon: 'ribbon', category: 'consistency', title: '80% Monthly' },
  rate_m90: { displayNum: '90%', unitText: 'MONTHLY', ribbon: 'starRibbon', category: 'consistency', title: '90% Monthly' },
  rate_y80: { displayNum: '80%', unitText: 'FULL YEAR', ribbon: 'starRibbon', category: 'consistency', title: '80% Annual' },

  // VOLUME
  vol_100: { displayNum: '100', unitText: 'CHECK-INS', ribbon: 'none', category: 'volume', title: '100 Check-Ins' },
  vol_500: { displayNum: '500', unitText: 'CHECK-INS', ribbon: 'ribbon', category: 'volume', title: '500 Check-Ins' },
  vol_1000: { displayNum: '1K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '1,000 Check-Ins' },
  vol_2500: { displayNum: '2.5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '2,500 Check-Ins' },
  vol_5000: { displayNum: '5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '5,000 Check-Ins' },
  vol_10000: { displayNum: '10K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '10,000 Check-Ins' }
};

function generateBadgeSVG(badgeId, unlocked = true) {
  const conf = BADGE_CATALOG[badgeId] || BADGE_CATALOG.streak_7;
  const meta = CATEGORY_META[conf.category] || CATEGORY_META.streak;

  const uid =
    'b_' +
    badgeId.replace(/[^a-zA-Z0-9_]/g, '_') +
    (unlocked ? '_u' : '_l');

  const numStr = String(conf.displayNum);

  let numClass = 'badge-svg-number';

  if (numStr.length >= 4) {
    numClass += ' badge-svg-number-xs';
  } else if (numStr.length >= 3) {
    numClass += ' badge-svg-number-small';
  }

  const yNum = conf.ribbon === 'none'
    ? 36
    : conf.category === 'volume'
      ? 44
      : 40;

  const yUnit = conf.ribbon === 'none' ? 72 : 75;

  /*
   * ------------------------------------------------------------
   * COLOR SYSTEM
   * ------------------------------------------------------------
   */

  let topC1;
  let topC2;
  let botC1;
  let botC2;
  let ribColor;
  let ribShadow;
  let glowColor;

  if (!unlocked) {
    // Locked = neutral, quiet, almost monochrome
    topC1 = '#181C22';
    topC2 = '#252B34';

    botC1 = '#303640';
    botC2 = '#1B2027';

    ribColor = '#343A44';
    ribShadow = '#181C22';

    glowColor = 'rgba(0,0,0,0)';
  } else {
    topC1 = meta.top;
    topC2 = meta.topLight;

    botC1 = meta.bottom;
    botC2 = meta.bottomDark;

    ribColor = conf.ribbonColor || meta.ribbon;
    ribShadow = conf.ribbonShadow || meta.ribbonShadow;

    glowColor = meta.glow;
  }

  /*
   * ------------------------------------------------------------
   * BADGE GEOMETRY
   * ------------------------------------------------------------
   */

  const hexD = `
    M 38,0
    L 92,0
    Q 98,0 101,6
    L 124,49
    Q 127,55 124,61
    L 101,104
    Q 98,110 92,110
    L 38,110
    Q 32,110 29,104
    L 6,61
    Q 3,55 6,49
    L 29,6
    Q 32,0 38,0
    Z
  `;

  /*
   * ------------------------------------------------------------
   * RIBBON
   * ------------------------------------------------------------
   */

  let ribbonMarkup = '';

  if (conf.ribbon === 'ribbon' || conf.ribbon === 'starRibbon') {
    const starMarkup =
      conf.ribbon === 'starRibbon'
        ? `
          <path
            d="M18,37 L20,42 L25,42 L21,45 L23,50
               L18,47 L13,50 L15,45 L11,42 L16,42 Z"
            fill="#FFFFFF"
            fill-opacity="${unlocked ? '0.88' : '0.25'}"
          />

          <path
            d="M112,37 L114,42 L119,42 L115,45 L117,50
               L112,47 L107,50 L109,45 L105,42 L110,42 Z"
            fill="#FFFFFF"
            fill-opacity="${unlocked ? '0.88' : '0.25'}"
          />
        `
        : '';

    ribbonMarkup = `
      <!-- Ribbon shadow -->
      <path
        d="M15 44 L-30 44 L-15 59 L-30 74 L15 74 Z"
        fill="${ribShadow}"
      />

      <path
        d="M115 44 L160 44 L145 59 L160 74 L115 74 Z"
        fill="${ribShadow}"
      />

      <!-- Ribbon fold -->
      <path
        d="M-15 59 L15 74 L15 59 Z"
        fill="#000000"
        fill-opacity="${unlocked ? '0.22' : '0.35'}"
      />

      <path
        d="M145 59 L115 74 L115 59 Z"
        fill="#000000"
        fill-opacity="${unlocked ? '0.22' : '0.35'}"
      />

      <!-- Main ribbon -->
      <path
        d="M-15 29 Q65 14 145 29 L145 59 Q65 44 -15 59 Z"
        fill="${ribColor}"
        filter="url(#ribbonShad_${uid})"
      />

      ${starMarkup}
    `;
  }

  /*
   * ------------------------------------------------------------
   * SVG
   * ------------------------------------------------------------
   */

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-35 -8 200 135"
      class="milestone-badge-svg ${unlocked ? 'unlocked' : 'locked'}"
      aria-label="${escapeHtml(conf.title)}"
    >
      <defs>
        <!-- Main badge gradient -->
        <linearGradient
          id="top_${uid}"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="${topC1}" />
          <stop offset="100%" stop-color="${topC2}" />
        </linearGradient>

        <!-- Lower badge gradient -->
        <linearGradient
          id="bot_${uid}"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color="${botC1}" />
          <stop offset="100%" stop-color="${botC2}" />
        </linearGradient>

        <!-- Very subtle category glow -->
        <filter
          id="badgeGlow_${uid}"
          x="-45%"
          y="-45%"
          width="190%"
          height="190%"
        >
          <feGaussianBlur
            stdDeviation="5"
            result="blur"
          />

          <feFlood
            flood-color="${glowColor}"
            flood-opacity="${unlocked ? '1' : '0'}"
            result="glowColor"
          />

          <feComposite
            in="glowColor"
            in2="blur"
            operator="in"
            result="coloredGlow"
          />

          <feMerge>
            <feMergeNode in="coloredGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Very subtle depth shadow -->
        <filter
          id="badgeShad_${uid}"
          x="-35%"
          y="-35%"
          width="170%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            flood-color="#000000"
            flood-opacity="0.35"
          />
        </filter>

        <!-- Ribbon shadow -->
        <filter
          id="ribbonShad_${uid}"
          x="-30%"
          y="-30%"
          width="160%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.5"
            flood-color="#000000"
            flood-opacity="0.25"
          />
        </filter>

        <clipPath id="clip_${uid}">
          <path d="${hexD}" />
        </clipPath>
      </defs>

      <!-- =====================================================
           BADGE BODY
           ===================================================== -->
      <g filter="url(#badgeGlow_${uid})">
        <g filter="url(#badgeShad_${uid})">
          <!-- Main hex -->
          <path
            d="${hexD}"
            fill="url(#top_${uid})"
          />

          <!-- Lower section -->
          <g clip-path="url(#clip_${uid})">
            <path
              d="M0 58 Q65 43 130 58 L130 115 L0 115 Z"
              fill="url(#bot_${uid})"
            />
          </g>
        </g>

        <!-- Thin premium edge -->
        <path
          d="${hexD}"
          fill="none"
          stroke="${unlocked ? meta.color : '#4B5563'}"
          stroke-opacity="${unlocked ? '0.65' : '0.35'}"
          stroke-width="1.2"
        />

        <!-- Top highlight -->
        <path
          d="M30 7 Q65 -1 100 7"
          fill="none"
          stroke="#FFFFFF"
          stroke-opacity="${unlocked ? '0.16' : '0.06'}"
          stroke-width="1.6"
        />
      </g>

      <!-- =====================================================
           RIBBON
           ===================================================== -->
      ${ribbonMarkup}

      <!-- =====================================================
           BADGE TEXT
           ===================================================== -->
      <text
        x="65"
        y="${yNum}"
        class="${numClass}"
        fill="#FFFFFF"
        fill-opacity="${unlocked ? '1' : '0.45'}"
      >
        ${escapeHtml(conf.displayNum)}
      </text>

      <text
        x="65"
        y="${yUnit}"
        class="badge-svg-unit"
        fill="#FFFFFF"
        fill-opacity="${unlocked ? '0.82' : '0.35'}"
      >
        ${escapeHtml(conf.unitText)}
      </text>
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
