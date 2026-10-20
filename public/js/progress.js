// Committed Multi-Year Progression & Mastery Controller

let progressionData = null;
let progressHabitsData = [];
let currentActivityWeeks = 26;
let currentModalCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadProgressData();
  checkActivityHash();
});

function checkActivityHash() {
  if (window.location.hash === '#activity' || window.location.hash === '#progressActivitySection') {
    setTimeout(() => {
      const el = document.getElementById('progressActivitySection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 350);
  }
}

function initTheme() {
  const saved = localStorage.getItem('committed_theme') || localStorage.getItem('habitkit_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

async function loadProgressData() {
  try {
    const [res, habitsRes] = await Promise.all([
      API.getProgression(),
      API.getHabits().catch(() => ({ success: false, habits: [] }))
    ]);
    if (!res.success) return;

    progressionData = res;
    progressHabitsData = (habitsRes && habitsRes.habits) || [];
    const achievements = res.achievements || [];
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    renderHeroCard(res);
    renderLifetimeStats(res.lifetimeStats, unlockedCount);
    renderNextBadge(achievements);
    renderYourBadges(achievements);
    renderProgressActivity(progressHabitsData, currentActivityWeeks);

    const seeAllBtn = document.getElementById('progressSeeAllBtn');
    if (seeAllBtn) {
      seeAllBtn.textContent = `See all (${achievements.length || 24}) →`;
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error loading progress data:', err);
    const container = document.querySelector('.app-container') || document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i>
        <span>Unable to fetch progression data: ${escapeHtml(err.message || 'Connection error')}</span>
      </div>
      <button class="btn btn-secondary" onclick="loadProgressData()" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Retry</button>
    `;
    container.insertBefore(banner, container.firstChild);
    if (window.lucide) lucide.createIcons();
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

/**
 * 1. Level Card:
 * Label "Level [n]", Headline "[n] XP to Level [n+1]", Progress bar, current & next XP
 */
function renderHeroCard(data) {
  const levelNum = data.level || 1;
  const nextLevel = levelNum + 1;
  const xpNeeded = data.xpRemaining !== undefined ? data.xpRemaining : Math.max(0, (data.nextLevelTargetXP || 100) - (data.currentLevelXP || 0));

  const labelEl = document.getElementById('levelCardLabel');
  if (labelEl) labelEl.textContent = `Level ${levelNum}`;

  const headlineEl = document.getElementById('levelCardHeadline');
  if (headlineEl) headlineEl.textContent = `${xpNeeded.toLocaleString()} XP to Level ${nextLevel}`;

  const fillEl = document.getElementById('levelProgressFill');
  if (fillEl) fillEl.style.width = `${data.progressPercent || 0}%`;

  const currEl = document.getElementById('levelXpCurrent');
  if (currEl) currEl.textContent = `${(data.currentLevelXP || 0).toLocaleString()} XP`;

  const nextEl = document.getElementById('levelXpNext');
  if (nextEl) nextEl.textContent = `${(data.nextLevelTargetXP || 100).toLocaleString()} XP`;
}

/**
 * 2. Best Streak Card & 2x2 Stats Grid:
 * Total XP, Check ins, Perfect days ("Not yet" if 0), Badges ("6 of 24")
 */
function renderLifetimeStats(stats, unlockedCount = 0) {
  if (!stats) return;

  // Best streak card
  const bestStreakEl = document.getElementById('bestStreakDays');
  if (bestStreakEl) {
    bestStreakEl.textContent = `${stats.longestStreak || 0} days`;
  }

  // Total XP
  const xpEl = document.getElementById('statTotalXp');
  if (xpEl) xpEl.textContent = (stats.lifetimeXP || 0).toLocaleString();

  // Check ins
  const checkInsEl = document.getElementById('statCheckIns');
  if (checkInsEl) checkInsEl.textContent = (stats.totalCompletions || 0).toLocaleString();

  // Perfect days
  const pdCard = document.getElementById('statCardPerfectDays');
  const perfectDaysCount = stats.perfectDays || 0;
  if (pdCard) {
    if (perfectDaysCount === 0) {
      pdCard.innerHTML = `
        <div class="progress-stat-label">Perfect days</div>
        <div class="progress-stat-val muted">Not yet</div>
        <div class="progress-stat-sub-text">Finish every habit in one day</div>
      `;
    } else {
      pdCard.innerHTML = `
        <div class="progress-stat-label">Perfect days</div>
        <div class="progress-stat-val">${perfectDaysCount.toLocaleString()}</div>
      `;
    }
  }

  // Badges count ("6 of 24")
  const badgesEl = document.getElementById('statBadgesCount');
  if (badgesEl) {
    badgesEl.textContent = `${unlockedCount} of 24`;
  }
}

/**
 * 3. Next Badge Section:
 * Circular progress ring with badge icon inside.
 * Badge title, category chip, headline ("2 days left" or "14 check ins left"), sub text ("Finish 3 more check ins to reach 100").
 * Tap opens badge detail or celebration. Hide entire card if all 24 unlocked.
 */
function renderNextBadge(achievements) {
  const section = document.getElementById('nextBadgeSection');
  const card = document.getElementById('nextBadgeCard');
  if (!section || !card) return;

  const locked = achievements.filter(a => !a.unlocked);

  if (locked.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Sort locked by highest percentage (current / target)
  locked.sort((a, b) => {
    const pctA = a.target > 0 ? (a.current / a.target) : 0;
    const pctB = b.target > 0 ? (b.current / b.target) : 0;
    return pctB - pctA;
  });

  const next = locked[0];
  const catMeta = CATEGORY_META[next.category] || CATEGORY_META.streak;
  const current = next.current || 0;
  const target = next.target || 1;
  const percent = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  const remaining = Math.max(0, target - current);
  const conf = BADGE_CATALOG[next.id] || { title: next.name, displayNum: String(target) };

  // Headline: "2 days left" or "14 check ins left"
  let headlineText = '';
  if (next.category === 'streak' || next.category === 'perfect_days') {
    headlineText = `${remaining} ${remaining === 1 ? 'day' : 'days'} left`;
  } else if (next.category === 'consistency') {
    headlineText = `${remaining}% left`;
  } else {
    headlineText = `${remaining.toLocaleString()} ${remaining === 1 ? 'check in' : 'check ins'} left`;
  }

  // Sub text: "Finish 3 more check ins to reach 100"
  let subText = '';
  if (next.category === 'streak') {
    subText = `Maintain your streak for ${remaining} more ${remaining === 1 ? 'day' : 'days'} to reach ${target}`;
  } else if (next.category === 'perfect_days') {
    subText = `Complete ${remaining} more ${remaining === 1 ? 'day' : 'days'} with all habits done to reach ${target}`;
  } else if (next.category === 'consistency') {
    subText = `Increase your monthly completion to reach ${target}%`;
  } else {
    subText = `Finish ${remaining.toLocaleString()} more ${remaining === 1 ? 'check in' : 'check ins'} to reach ${target.toLocaleString()}`;
  }

  // Circular progress ring calculation (r = 27, circumference = 2 * PI * 27 = ~169.64)
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - (percent / 100));
  const badgeSvg = generateBadgeSVG(next.id, false);

  card.onclick = () => showBadgeDetailModal(next.id);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  card.innerHTML = `
    <div class="next-badge-ring-col">
      <svg class="next-badge-ring-svg" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="${radius}" class="next-badge-ring-bg" stroke-width="4.5" fill="none" />
        <circle 
          cx="34" 
          cy="34" 
          r="${radius}" 
          class="next-badge-ring-fill" 
          stroke="${catMeta.color}" 
          stroke-width="4.5" 
          fill="none" 
          stroke-linecap="round"
          stroke-dasharray="${circumference.toFixed(2)}" 
          stroke-dashoffset="${strokeOffset.toFixed(2)}"
        />
      </svg>
      <div class="next-badge-ring-icon-wrap">
        ${badgeSvg}
      </div>
    </div>

    <div class="next-badge-info">
      <div class="next-badge-top-row">
        <span class="next-badge-category-chip" style="color: ${catMeta.color}; background: ${catMeta.color}1f; border: 1px solid ${catMeta.color}44;">
          ${escapeHtml(catMeta.name)}
        </span>
        <span class="next-badge-xp-pill">+${next.xpBonus} XP</span>
      </div>
      <div class="next-badge-title">${escapeHtml(conf.title || next.name)}</div>
      <div class="next-badge-headline">${escapeHtml(headlineText)}</div>
      <div class="next-badge-subtext">${escapeHtml(subText)}</div>
    </div>
  `;
}

/**
 * 4. Your Badges Section (4-column row):
 * Displays 4 most recently unlocked badges: hexagon badge with number, small label under it.
 * Tapping any badge opens the detail view / celebration.
 */
function renderYourBadges(achievements) {
  const container = document.getElementById('yourBadgesRow');
  if (!container) return;

  const unlocked = achievements.filter(a => a.unlocked);

  if (unlocked.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
        No badges unlocked yet. Keep up your daily habits to earn badges!
      </div>
    `;
    return;
  }

  // Show up to 4 most recently unlocked badges
  const displayBadges = unlocked.slice(-4);

  container.innerHTML = displayBadges.map(b => {
    const svgMarkup = generateBadgeSVG(b.id, true);
    const shortLabel = SHORT_BADGE_LABELS[b.id] || cleanBadgeName(b.name);

    return `
      <div 
        class="your-badge-item"
        onclick="showBadgeDetailModal('${b.id}')"
        title="${escapeHtml(b.name)} - Tap to view"
        role="button"
        tabindex="0"
      >
        <div class="your-badge-svg-wrap">
          ${svgMarkup}
        </div>
        <div class="your-badge-label">${escapeHtml(shortLabel)}</div>
      </div>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// Badge Metas & Catalog Specs
// ------------------------------------------------------------------------------
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
    name: 'Perfect days',
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
    name: 'Total logs',
    glow: 'rgba(6, 182, 212, 0.20)',
    top: '#103B49',
    topLight: '#176E87',
    bottom: '#3C9FC0',
    bottomDark: '#154E63',
    ribbon: '#5BB6D5',
    ribbonShadow: '#347A96'
  }
};

const BADGE_CATALOG = {
  // STREAKS
  streak_7: { displayNum: '7', unitText: 'DAYS', ribbon: 'none', category: 'streak', title: '7-day streak' },
  streak_21: { displayNum: '21', unitText: 'DAYS', ribbon: 'ribbon', category: 'streak', title: '21-day streak' },
  streak_30: { displayNum: '30', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '30-day streak' },
  streak_50: { displayNum: '50', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '50-day streak' },
  streak_100: { displayNum: '100', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '100-day streak' },
  streak_180: { displayNum: '180', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '180-day streak' },
  streak_365: { displayNum: '365', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '365-day streak' },
  streak_730: { displayNum: '730', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '730-day streak' },

  // PERFECT DAYS
  pd_1: { displayNum: '1', unitText: 'PERFECT DAY', ribbon: 'none', category: 'perfect_days', title: 'First perfect day' },
  pd_7: { displayNum: '7', unitText: 'PERFECT DAYS', ribbon: 'ribbon', category: 'perfect_days', title: 'Perfect week' },
  pd_30: { displayNum: '30', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect month' },
  pd_100: { displayNum: '100', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '100 perfect days' },
  pd_365: { displayNum: '365', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect year' },
  pd_500: { displayNum: '500', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '500 perfect days' },

  // CONSISTENCY
  rate_m70: { displayNum: '70%', unitText: 'MONTHLY', ribbon: 'none', category: 'consistency', title: '70% monthly' },
  rate_m80: { displayNum: '80%', unitText: 'MONTHLY', ribbon: 'ribbon', category: 'consistency', title: '80% monthly' },
  rate_m90: { displayNum: '90%', unitText: 'MONTHLY', ribbon: 'starRibbon', category: 'consistency', title: '90% monthly' },
  rate_y80: { displayNum: '80%', unitText: 'FULL YEAR', ribbon: 'starRibbon', category: 'consistency', title: '80% annual' },

  // VOLUME
  vol_100: { displayNum: '100', unitText: 'CHECK-INS', ribbon: 'none', category: 'volume', title: '100 check-ins' },
  vol_500: { displayNum: '500', unitText: 'CHECK-INS', ribbon: 'ribbon', category: 'volume', title: '500 check-ins' },
  vol_1000: { displayNum: '1K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '1,000 check-ins' },
  vol_2500: { displayNum: '2.5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '2,500 check-ins' },
  vol_5000: { displayNum: '5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '5,000 check-ins' },
  vol_10000: { displayNum: '10K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '10,000 check-ins' }
};

// Plain words, 1-line descriptions with no marketing phrases
const SHORT_BADGE_DESCRIPTIONS = {
  streak_7: 'Keep a 7-day streak.',
  streak_21: 'Keep a 21-day streak.',
  streak_30: 'Keep a 30-day streak.',
  streak_50: 'Keep a 50-day streak.',
  streak_100: 'Keep a 100-day streak.',
  streak_180: 'Keep a 180-day streak.',
  streak_365: 'Keep a 365-day streak.',
  streak_730: 'Keep a 730-day streak.',

  pd_1: 'Complete every habit in one day.',
  pd_7: 'Complete 7 perfect days.',
  pd_30: 'Complete 30 perfect days.',
  pd_100: 'Complete 100 perfect days.',
  pd_365: 'Complete 365 perfect days.',
  pd_500: 'Complete 500 perfect days.',

  rate_m70: 'Reach 70% completion in a month.',
  rate_m80: 'Reach 80% completion in a month.',
  rate_m90: 'Reach 90% completion in a month.',
  rate_y80: 'Reach 80% completion across a year.',

  vol_100: 'Log 100 total check-ins.',
  vol_500: 'Log 500 total check-ins.',
  vol_1000: 'Log 1,000 total check-ins.',
  vol_2500: 'Log 2,500 total check-ins.',
  vol_5000: 'Log 5,000 total check-ins.',
  vol_10000: 'Log 10,000 total check-ins.'
};

// Compact labels for the 4-column row to prevent text cut-off
const SHORT_BADGE_LABELS = {
  streak_7: '7 days',
  streak_21: '21 days',
  streak_30: '30 days',
  streak_50: '50 days',
  streak_100: '100 days',
  streak_180: '180 days',
  streak_365: '365 days',
  streak_730: '730 days',

  pd_1: '1 perfect day',
  pd_7: '7 perfect days',
  pd_30: '30 perfect days',
  pd_100: '100 perfect days',
  pd_365: '365 perfect days',
  pd_500: '500 perfect days',

  rate_m70: '70% month',
  rate_m80: '80% month',
  rate_m90: '90% month',
  rate_y80: '80% year',

  vol_100: '100 logs',
  vol_500: '500 logs',
  vol_1000: '1,000 logs',
  vol_2500: '2,500 logs',
  vol_5000: '5,000 logs',
  vol_10000: '10,000 logs'
};

function cleanBadgeName(name) {
  if (!name) return '';
  return name.replace(' Consistency', '').replace(' Check-Ins', ' check-ins').toLowerCase();
}

/**
 * Generates badge SVG.
 * For locked badges, uses a muted category tint (not dead grey), number still crisp & readable!
 */
function generateBadgeSVG(badgeId, unlocked = true) {
  const conf = BADGE_CATALOG[badgeId] || BADGE_CATALOG.streak_7;
  const meta = CATEGORY_META[conf.category] || CATEGORY_META.streak;

  const uid = 'b_' + badgeId.replace(/[^a-zA-Z0-9_]/g, '_') + (unlocked ? '_u' : '_l');
  const numStr = String(conf.displayNum);

  let numClass = 'badge-svg-number';
  if (numStr.length >= 4) {
    numClass += ' badge-svg-number-xs';
  } else if (numStr.length >= 3) {
    numClass += ' badge-svg-number-small';
  }

  const yNum = conf.ribbon === 'none' ? 36 : conf.category === 'volume' ? 44 : 40;
  const yUnit = conf.ribbon === 'none' ? 72 : 75;

  let topC1;
  let topC2;
  let botC1;
  let botC2;
  let ribColor;
  let ribShadow;
  let glowColor;
  let strokeColor;

  if (!unlocked) {
    // Muted tint of category colour (not dead grey), number still readable!
    if (conf.category === 'streak') {
      topC1 = '#1a142e';
      topC2 = '#261c46';
      botC1 = '#32255c';
      botC2 = '#19132c';
      ribColor = '#3b2f66';
      ribShadow = '#150f26';
      strokeColor = '#5e48b8';
      glowColor = 'rgba(139, 92, 246, 0.08)';
    } else if (conf.category === 'perfect_days') {
      topC1 = '#261b0c';
      topC2 = '#382711';
      botC1 = '#4a3416';
      botC2 = '#20160a';
      ribColor = '#57421e';
      ribShadow = '#181007';
      strokeColor = '#9e731e';
      glowColor = 'rgba(245, 158, 11, 0.08)';
    } else if (conf.category === 'consistency') {
      topC1 = '#0f201d';
      topC2 = '#15332e';
      botC1 = '#1d463f';
      botC2 = '#0d1a18';
      ribColor = '#24534b';
      ribShadow = '#0a1614';
      strokeColor = '#227568';
      glowColor = 'rgba(16, 185, 129, 0.08)';
    } else {
      // volume
      topC1 = '#0e1d28';
      topC2 = '#132d3e';
      botC1 = '#1a3d54';
      botC2 = '#0c1822';
      ribColor = '#1f4862';
      ribShadow = '#0a131c';
      strokeColor = '#1d5a7d';
      glowColor = 'rgba(6, 182, 212, 0.08)';
    }
  } else {
    topC1 = meta.top;
    topC2 = meta.topLight;
    botC1 = meta.bottom;
    botC2 = meta.bottomDark;
    ribColor = conf.ribbonColor || meta.ribbon;
    ribShadow = conf.ribbonShadow || meta.ribbonShadow;
    glowColor = meta.glow;
    strokeColor = meta.color;
  }

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

  let ribbonMarkup = '';
  if (conf.ribbon === 'ribbon' || conf.ribbon === 'starRibbon') {
    const starMarkup = conf.ribbon === 'starRibbon'
      ? `
        <path d="M18,37 L20,42 L25,42 L21,45 L23,50 L18,47 L13,50 L15,45 L11,42 L16,42 Z" fill="#FFFFFF" fill-opacity="${unlocked ? '0.88' : '0.35'}" />
        <path d="M112,37 L114,42 L119,42 L115,45 L117,50 L112,47 L107,50 L109,45 L105,42 L110,42 Z" fill="#FFFFFF" fill-opacity="${unlocked ? '0.88' : '0.35'}" />
      `
      : '';

    ribbonMarkup = `
      <path d="M15 44 L-30 44 L-15 59 L-30 74 L15 74 Z" fill="${ribShadow}" />
      <path d="M115 44 L160 44 L145 59 L160 74 L115 74 Z" fill="${ribShadow}" />
      <path d="M-15 59 L15 74 L15 59 Z" fill="#000000" fill-opacity="${unlocked ? '0.22' : '0.35'}" />
      <path d="M145 59 L115 74 L115 59 Z" fill="#000000" fill-opacity="${unlocked ? '0.22' : '0.35'}" />
      <path d="M-15 29 Q65 14 145 29 L145 59 Q65 44 -15 59 Z" fill="${ribColor}" filter="url(#ribbonShad_${uid})" />
      ${starMarkup}
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-35 -8 200 135" class="milestone-badge-svg ${unlocked ? 'unlocked' : 'locked'}" aria-label="${escapeHtml(conf.title)}">
      <defs>
        <linearGradient id="top_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${topC1}" />
          <stop offset="100%" stop-color="${topC2}" />
        </linearGradient>
        <linearGradient id="bot_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${botC1}" />
          <stop offset="100%" stop-color="${botC2}" />
        </linearGradient>
        <filter id="badgeGlow_${uid}" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feFlood flood-color="${glowColor}" flood-opacity="${unlocked ? '1' : '0.4'}" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="coloredGlow" />
          <feMerge>
            <feMergeNode in="coloredGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="badgeShad_${uid}" x="-35%" y="-35%" width="170%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.35" />
        </filter>
        <filter id="ribbonShad_${uid}" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.25" />
        </filter>
        <clipPath id="clip_${uid}">
          <path d="${hexD}" />
        </clipPath>
      </defs>

      <g filter="url(#badgeGlow_${uid})">
        <g filter="url(#badgeShad_${uid})">
          <path d="${hexD}" fill="url(#top_${uid})" />
          <g clip-path="url(#clip_${uid})">
            <path d="M0 58 Q65 43 130 58 L130 115 L0 115 Z" fill="url(#bot_${uid})" />
          </g>
        </g>
        <path d="${hexD}" fill="none" stroke="${strokeColor}" stroke-opacity="${unlocked ? '0.65' : '0.45'}" stroke-width="1.2" />
        <path d="M30 7 Q65 -1 100 7" fill="none" stroke="#FFFFFF" stroke-opacity="${unlocked ? '0.16' : '0.08'}" stroke-width="1.6" />
      </g>

      ${ribbonMarkup}

      <text x="65" y="${yNum}" class="${numClass}" fill="#FFFFFF" fill-opacity="${unlocked ? '1' : '0.78'}">
        ${escapeHtml(conf.displayNum)}
      </text>

      <text x="65" y="${yUnit}" class="badge-svg-unit" fill="#FFFFFF" fill-opacity="${unlocked ? '0.82' : '0.55'}">
        ${escapeHtml(conf.unitText)}
      </text>
    </svg>
  `;
}

// ------------------------------------------------------------------------------
// Modal Logic: All Badges
// ------------------------------------------------------------------------------
function openAllBadgesModal() {
  if (!progressionData) return;
  const overlay = document.getElementById('allBadgesModalOverlay');
  if (!overlay) return;

  const all = progressionData.achievements || [];
  const unlockedCount = all.filter(a => a.unlocked).length;
  const subEl = document.getElementById('modalBadgesSubtitle');
  if (subEl) {
    subEl.textContent = `${unlockedCount} of ${all.length} unlocked`;
  }

  currentModalCategory = 'all';
  document.querySelectorAll('.all-badges-modal .modal-filter-chip').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === 0);
  });

  renderModalBadgesGrouped();
  overlay.classList.add('open');
  if (window.UI && UI.lockBodyScroll) UI.lockBodyScroll();
  if (window.lucide) lucide.createIcons();
}

function closeAllBadgesModal() {
  const overlay = document.getElementById('allBadgesModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    if (window.UI && UI.unlockBodyScroll) UI.unlockBodyScroll();
  }
}

function setModalCategoryFilter(category, btn) {
  currentModalCategory = category;
  document.querySelectorAll('.all-badges-modal .modal-filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderModalBadgesGrouped();
  if (window.lucide) lucide.createIcons();
}

/**
 * Renders badges inside modal grouped by category:
 * One small heading per group ("Streaks", "Perfect days", ...).
 * Unlocked first, then locked by highest progress percentage.
 * 2-column grid of stacked cards.
 * Unlocked: icon, title, 'Unlocked'
 * Locked: muted icon, title, progress bar, action (example: '14 more check ins')
 */
function renderModalBadgesGrouped() {
  if (!progressionData || !progressionData.achievements) return;
  const container = document.getElementById('modalBadgesContainer');
  if (!container) return;

  const all = progressionData.achievements;

  const GROUPS = [
    { id: 'streak', name: 'Streaks' },
    { id: 'perfect_days', name: 'Perfect days' },
    { id: 'consistency', name: 'Consistency' },
    { id: 'volume', name: 'Total logs' }
  ];

  const visibleGroups = currentModalCategory === 'all'
    ? GROUPS
    : GROUPS.filter(g => g.id === currentModalCategory);

  container.innerHTML = visibleGroups.map(group => {
    const groupBadges = all.filter(a => a.category === group.id);

    // Sort: unlocked first, then locked by highest progress percentage
    groupBadges.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (!a.unlocked && !b.unlocked) {
        const pctA = a.target > 0 ? (a.current / a.target) : 0;
        const pctB = b.target > 0 ? (b.current / b.target) : 0;
        return pctB - pctA;
      }
      return 0;
    });

    const cardsHtml = groupBadges.map(b => {
      const isUnlocked = !!b.unlocked;
      const catMeta = CATEGORY_META[b.category] || CATEGORY_META.streak;
      const percent = Math.min(100, Math.max(0, Math.round((b.current / b.target) * 100)));
      const svgMarkup = generateBadgeSVG(b.id, isUnlocked);
      const conf = BADGE_CATALOG[b.id];
      const titleText = conf ? conf.title : cleanBadgeName(b.name);

      if (isUnlocked) {
        return `
          <div 
            class="modal-badge-card unlocked" 
            onclick="showBadgeDetailModal('${b.id}')"
            role="button"
            tabindex="0"
          >
            <div class="modal-badge-svg-wrap">
              ${svgMarkup}
            </div>
            <div class="modal-card-name">${escapeHtml(titleText)}</div>
            <div class="modal-card-unlocked-status">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Unlocked</span>
            </div>
          </div>
        `;
      } else {
        const remaining = Math.max(0, b.target - b.current);
        let actionText = '';
        if (b.category === 'streak') {
          actionText = `${remaining} more ${remaining === 1 ? 'day' : 'days'}`;
        } else if (b.category === 'perfect_days') {
          actionText = `${remaining} more ${remaining === 1 ? 'perfect day' : 'perfect days'}`;
        } else if (b.category === 'consistency') {
          actionText = `${remaining}% more consistency`;
        } else {
          actionText = `${remaining.toLocaleString()} more ${remaining === 1 ? 'check in' : 'check ins'}`;
        }

        return `
          <div 
            class="modal-badge-card locked" 
            onclick="showBadgeDetailModal('${b.id}')"
            role="button"
            tabindex="0"
          >
            <div class="modal-badge-svg-wrap">
              ${svgMarkup}
            </div>
            <div class="modal-card-name">${escapeHtml(titleText)}</div>
            <div class="modal-mini-track">
              <div class="modal-mini-fill" style="width: ${percent}%; background: ${catMeta.color};"></div>
            </div>
            <div class="modal-card-action-text">${escapeHtml(actionText)}</div>
          </div>
        `;
      }
    }).join('');

    return `
      <div class="modal-group-block">
        <h4 class="modal-group-heading">${escapeHtml(group.name)}</h4>
        <div class="modal-group-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Tap any badge opens detail modal with fanfare/confetti if unlocked,
 * or detailed progress sheet if locked.
 */
function showBadgeDetailModal(badgeId) {
  if (!progressionData || !progressionData.achievements) return;
  const achievement = progressionData.achievements.find(a => a.id === badgeId);
  if (!achievement) return;

  if (achievement.unlocked) {
    if (window.Utils && Utils.showMilestoneUnlockedModal) {
      Utils.showMilestoneUnlockedModal(achievement);
    }
  } else {
    showLockedBadgeModal(achievement);
  }
}

function showLockedBadgeModal(badge) {
  const catMeta = CATEGORY_META[badge.category] || CATEGORY_META.streak;
  const conf = BADGE_CATALOG[badge.id] || { title: badge.name, displayNum: badge.target };
  const percent = Math.min(100, Math.max(0, Math.round((badge.current / badge.target) * 100)));
  const remaining = Math.max(0, badge.target - badge.current);
  const desc = SHORT_BADGE_DESCRIPTIONS[badge.id] || badge.description || '';
  const svgMarkup = generateBadgeSVG(badge.id, false);

  let remainingUnit = '';
  if (badge.category === 'streak' || badge.category === 'perfect_days') {
    remainingUnit = remaining === 1 ? 'day' : 'days';
  } else if (badge.category === 'consistency') {
    remainingUnit = '%';
  } else {
    remainingUnit = remaining === 1 ? 'check in' : 'check ins';
  }

  const existing = document.getElementById('lockedBadgeDetailOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lockedBadgeDetailOverlay';
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '10002';
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width: 380px; text-align: center; padding: 1.75rem 1.4rem;">
      <div class="sheet-drag-handle"></div>
      
      <div style="display: flex; justify-content: center; margin-bottom: 0.85rem;">
        <span style="font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${catMeta.color}; background: ${catMeta.color}1a; border: 1px solid ${catMeta.color}44; padding: 0.2rem 0.65rem; border-radius: var(--radius-full);">
          ${escapeHtml(catMeta.name)} · Locked
        </span>
      </div>

      <div style="width: 90px; height: 75px; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center;">
        ${svgMarkup}
      </div>

      <h3 style="font-size: 1.15rem; font-weight: 850; color: var(--text-primary); margin-bottom: 0.35rem;">
        ${escapeHtml(conf.title || badge.name)}
      </h3>
      <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.35; margin-bottom: 1.15rem;">
        ${escapeHtml(desc)}
      </p>

      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.15rem; text-align: left;">
        <div style="display: flex; justify-content: space-between; font-size: 0.74rem; font-weight: 750; color: var(--text-secondary); margin-bottom: 0.35rem;">
          <span>Progress</span>
          <span style="color: ${catMeta.color}; font-weight: 800;">${badge.current.toLocaleString()}${badge.unit || ''} / ${badge.target.toLocaleString()}${badge.unit || ''} (${percent}%)</span>
        </div>
        <div class="modal-mini-track" style="height: 6px; margin-bottom: 0.45rem;">
          <div class="modal-mini-fill" style="width: ${percent}%; background: ${catMeta.color};"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
          <span>${remaining.toLocaleString()} ${remainingUnit} to go</span>
          <span style="color: #10b981; font-weight: 800;">+${badge.xpBonus} XP reward</span>
        </div>
      </div>

      <button class="btn btn-secondary" onclick="document.getElementById('lockedBadgeDetailOverlay').remove()" style="width: 100%; font-weight: 750; font-size: 0.82rem; padding: 0.6rem;">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * 6. Progress Activity Heatmap Exploration (26 Weeks or Full Year)
 */
function setActivityRange(numWeeks, btn) {
  currentActivityWeeks = numWeeks;
  document.querySelectorAll('.activity-toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProgressActivity(progressHabitsData, numWeeks);
}

function getProgressWeeksData(numWeeks) {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - dayIndex);
  currentMonday.setHours(0, 0, 0, 0);

  // Start Monday is (numWeeks - 1) weeks prior to current week's Monday
  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - ((numWeeks - 1) * 7));

  const todayStr = window.Utils && Utils.getTodayStr ? Utils.getTodayStr() : new Date().toISOString().slice(0, 10);
  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + (w * 7));

    const m = weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        weekIndex: w,
        name: weekStart.toLocaleDateString('en-US', { month: 'short' })
      });
      lastMonth = m;
    } else {
      monthLabels.push({
        weekIndex: w,
        name: ''
      });
    }

    const days = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      const dateStr = window.Utils && Utils.formatYMD ? Utils.formatYMD(dayDate) : dayDate.toISOString().slice(0, 10);
      const isToday = (dateStr === todayStr);
      const isFuture = (dateStr > todayStr);

      days.push({
        date: dateStr,
        isToday,
        isFuture,
        dayOfWeek: d
      });
    }
    weeks.push(days);
  }

  return { weeks, monthLabels };
}

function renderProgressActivity(habits, numWeeks = 26) {
  const container = document.getElementById('progressHeatmapGrid');
  if (!container) return;

  const { weeks, monthLabels } = getProgressWeeksData(numWeeks);
  const totalHabits = (habits && habits.length) || 0;
  let totalCompletions = 0;

  // Month labels
  const monthsHtml = monthLabels.map(m => `
    <div class="today-heatmap-month-col" style="width: 12px; font-size: 0.58rem; color: var(--text-muted);">${m.name || ''}</div>
  `).join('');

  // Matrix (consistent square cells & intensity with Today)
  const matrixHtml = weeks.map(weekDays => {
    const tilesHtml = weekDays.map(day => {
      const doneCount = habits.filter(h => h.logs && h.logs.includes(day.date)).length;
      totalCompletions += doneCount;
      const ratio = totalHabits > 0 ? (doneCount / totalHabits) : 0;

      let bgStyle = '';
      if (doneCount > 0) {
        if (ratio <= 0.25) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.35);';
        } else if (ratio <= 0.50) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.60);';
        } else if (ratio <= 0.85) {
          bgStyle = 'background-color: rgba(16, 185, 129, 0.82);';
        } else {
          bgStyle = 'background-color: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.45);';
        }
      }

      const todayClass = day.isToday ? 'is-today' : '';
      const tooltipText = `${day.date}: ${doneCount} of ${totalHabits} habit${totalHabits === 1 ? '' : 's'} completed`;

      return `
        <div 
          class="today-heatmap-tile ${todayClass}"
          style="${bgStyle}"
          data-date="${day.date}"
          data-done="${doneCount}"
          title="${tooltipText}"
          aria-label="${tooltipText}"
        ></div>
      `;
    }).join('');

    return `
      <div class="today-heatmap-week-col" style="gap: 2.5px;">
        ${tilesHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="today-heatmap-months-row" style="gap: 2.5px; height: 13px; margin-bottom: 2px;">
      ${monthsHtml}
    </div>
    <div class="today-heatmap-matrix" style="gap: 2.5px;">
      ${matrixHtml}
    </div>
  `;

  // Update summary text
  const summaryEl = document.getElementById('activitySummaryText');
  if (summaryEl) {
    summaryEl.textContent = `${totalCompletions.toLocaleString()} check-ins across past ${numWeeks === 52 ? 'year' : '26 weeks'}`;
  }
}

