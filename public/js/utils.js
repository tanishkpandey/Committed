// Committed Utilities & Visual Feedback

const Utils = {
  formatYMD(d) {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getTodayStr() {
    return this.formatYMD(new Date());
  },

  // Global Unclipped Floating Tooltip Engine (Auto-dismisses after 1s)
  initGlobalTooltips() {
    let tooltipEl = document.getElementById('appGlobalTooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'appGlobalTooltip';
      document.body.appendChild(tooltipEl);
    }

    const hideTooltip = () => {
      if (this._tooltipTimer) {
        clearTimeout(this._tooltipTimer);
        this._tooltipTimer = null;
      }
      tooltipEl.classList.remove('visible');
    };

    const showTooltip = (tile) => {
      const dateStr = tile.dataset.date;
      if (!dateStr) return;

      hideTooltip();

      const isCompleted = tile.classList.contains('completed');
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      tooltipEl.innerHTML = `
        <div class="tooltip-date-line">${formattedDate}</div>
        <div class="tooltip-status-line ${isCompleted ? 'done' : 'not-done'}">
          <span style="font-size: 0.75rem;">${isCompleted ? '✓' : '○'}</span>
          <span>${isCompleted ? 'Completed (+10 XP)' : 'Not logged'}</span>
        </div>
      `;

      const rect = tile.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const topY = rect.top - 8;

      tooltipEl.style.left = `${centerX}px`;

      if (topY < 50) {
        // Flip below if close to window top
        tooltipEl.style.top = `${rect.bottom + 8}px`;
        tooltipEl.classList.add('flipped');
      } else {
        tooltipEl.style.top = `${topY}px`;
        tooltipEl.classList.remove('flipped');
      }

      tooltipEl.classList.add('visible');

      // Auto-hide tooltip after 1 second (1000ms)
      this._tooltipTimer = setTimeout(() => {
        tooltipEl.classList.remove('visible');
        this._tooltipTimer = null;
      }, 1000);
    };

    document.querySelectorAll('.grid-tile, .mini-cal-tile').forEach(tile => {
      tile.removeEventListener('mouseenter', tile._showHandler);
      tile.removeEventListener('mouseleave', tile._hideHandler);

      tile._showHandler = () => showTooltip(tile);
      tile._hideHandler = () => hideTooltip();

      tile.addEventListener('mouseenter', tile._showHandler);
      tile.addEventListener('mouseleave', tile._hideHandler);
    });
  },

  formatDateRange(startStr, endStr) {
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const startObj = new Date(sy, sm - 1, sd);
    const endObj = new Date(ey, em - 1, ed);

    const sFormatted = startObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const eFormatted = endObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return startStr === endStr ? sFormatted : `${sFormatted} – ${eFormatted}`;
  },

  triggerHaptic(type = 'light') {
    if (localStorage.getItem('habitkit_haptics') === 'false') return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(12);
        else if (type === 'medium') navigator.vibrate(22);
        else if (type === 'success') navigator.vibrate([15, 35, 20]);
        else if (type === 'warning') navigator.vibrate([25, 40, 25]);
      } catch (e) {}
    }
  },

  syncMobileThemeColor(theme) {
    const meta = document.getElementById('themeColorMeta') || document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0a0c10');
    }
  },

  showToast(message, type = 'info', duration = 2800) {
    let container = document.getElementById('mobileToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mobileToastContainer';
      container.className = 'mobile-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `mobile-toast ${type === 'success' ? 'toast-success' : type === 'danger' ? 'toast-danger' : ''}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    else if (type === 'danger') iconName = 'alert-circle';
    
    const escapeText = (str) => {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[m]);
    };

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
      <span>${escapeText(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide && lucide.createIcons) lucide.createIcons();
    this.triggerHaptic(type === 'danger' ? 'warning' : 'light');

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 260);
    }, duration);
  },

  playSound(type = 'click') {
    this.triggerHaptic(type === 'complete' || type === 'levelup' ? 'success' : 'light');
    if (localStorage.getItem('habitkit_sound') === 'false') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'complete') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'levelup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'milestone') {
        // Multi-harmonic celebratory fanfare arpeggio (C5, E5, G5, B5, C6)
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
        notes.forEach((freq, idx) => {
          const oscNode = ctx.createOscillator();
          const noteGain = ctx.createGain();
          oscNode.type = 'triangle';
          oscNode.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.065);
          noteGain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.065);
          noteGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.065 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.065 + 0.36);
          oscNode.connect(noteGain);
          noteGain.connect(ctx.destination);
          oscNode.start(ctx.currentTime + idx * 0.065);
          oscNode.stop(ctx.currentTime + idx * 0.065 + 0.38);
        });
      }
    } catch (e) {}
  },

  calculateTop3Streaks(datesSet) {
    const sorted = Array.from(datesSet).sort();
    if (sorted.length === 0) return [];

    const streaks = [];
    let currentStreakCount = 1;
    let streakStart = sorted[0];
    let streakEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const [py, pm, pd] = sorted[i - 1].split('-').map(Number);
      const [cy, cm, cd] = sorted[i].split('-').map(Number);
      const prev = new Date(py, pm - 1, pd);
      const curr = new Date(cy, cm - 1, cd);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreakCount++;
        streakEnd = sorted[i];
      } else if (diffDays > 1) {
        streaks.push({
          days: currentStreakCount,
          startDate: streakStart,
          endDate: streakEnd,
          dateRangeFormatted: this.formatDateRange(streakStart, streakEnd)
        });
        currentStreakCount = 1;
        streakStart = sorted[i];
        streakEnd = sorted[i];
      }
    }

    streaks.push({
      days: currentStreakCount,
      startDate: streakStart,
      endDate: streakEnd,
      dateRangeFormatted: this.formatDateRange(streakStart, streakEnd)
    });

    const multiDayStreaks = streaks.filter(s => s.days >= 2);
    if (multiDayStreaks.length > 0) {
      return multiDayStreaks.sort((a, b) => b.days - a.days).slice(0, 3);
    }
    return streaks.sort((a, b) => b.days - a.days).slice(0, 3);
  },

  showFloatingXP(x, y, text = '+10 XP') {
    const safeX = (typeof x === 'number' && !isNaN(x)) ? x : (window.innerWidth / 2);
    const safeY = (typeof y === 'number' && !isNaN(y)) ? y : (window.innerHeight / 2);
    const el = document.createElement('div');
    el.className = 'floating-xp-pill';
    el.textContent = text;
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 80, safeX - 30))}px`;
    el.style.top = `${Math.max(20, safeY - 20)}px`;
    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 900);
  },

  // Level-Up Celebration Modal without undefined text
  showLevelUpModal(newLevel, prevLevel = Math.max(1, newLevel - 1)) {
    this.playSound('click');
    if (localStorage.getItem('habitkit_confetti') !== 'false') {
      this.triggerConfetti();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-box animate-pop-in" style="max-width: 360px; text-align: center; padding: 2rem 1.5rem;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);">
          <i data-lucide="award" style="width: 32px; height: 32px;"></i>
        </div>
        <div style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; margin-bottom: 0.35rem;">LEVEL UP!</div>
        
        <div class="level-roll-container">
          <div class="level-roll-track" id="levelRollTrack">
            <div class="level-roll-num">Level ${prevLevel}</div>
            <div class="level-roll-num">Level ${newLevel}</div>
          </div>
        </div>

        <button class="btn btn-primary" style="width: 100%; margin-top: 1.25rem;" onclick="this.closest('.modal-overlay').remove()">Keep Going</button>
      </div>
    `;
    document.body.appendChild(modal);
    lucide.createIcons();

    setTimeout(() => {
      const track = document.getElementById('levelRollTrack');
      if (track) {
        track.classList.add('rolled');
        this.playSound('levelup');
      }
    }, 1000);
  },

  _modalQueue: [],
  _isModalActive: false,

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  },

  CATEGORY_META: {
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
  },

  BADGE_CATALOG: {
    streak_7: { displayNum: '7', unitText: 'DAYS', ribbon: 'none', category: 'streak', title: '7-Day Streak' },
    streak_21: { displayNum: '21', unitText: 'DAYS', ribbon: 'ribbon', category: 'streak', title: '21-Day Streak' },
    streak_30: { displayNum: '30', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '30-Day Streak' },
    streak_50: { displayNum: '50', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '50-Day Streak' },
    streak_100: { displayNum: '100', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '100-Day Streak' },
    streak_180: { displayNum: '180', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '180-Day Streak' },
    streak_365: { displayNum: '365', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '365-Day Streak' },
    streak_730: { displayNum: '730', unitText: 'DAYS', ribbon: 'starRibbon', category: 'streak', title: '730-Day Streak' },
    pd_1: { displayNum: '1', unitText: 'PERFECT DAY', ribbon: 'none', category: 'perfect_days', title: 'First Perfect Day' },
    pd_7: { displayNum: '7', unitText: 'PERFECT DAYS', ribbon: 'ribbon', category: 'perfect_days', title: 'Perfect Week' },
    pd_30: { displayNum: '30', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect Month' },
    pd_100: { displayNum: '100', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '100 Perfect Days' },
    pd_365: { displayNum: '365', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: 'Perfect Year' },
    pd_500: { displayNum: '500', unitText: 'PERFECT DAYS', ribbon: 'starRibbon', category: 'perfect_days', title: '500 Perfect Days' },
    rate_m70: { displayNum: '70%', unitText: 'MONTHLY', ribbon: 'none', category: 'consistency', title: '70% Monthly' },
    rate_m80: { displayNum: '80%', unitText: 'MONTHLY', ribbon: 'ribbon', category: 'consistency', title: '80% Monthly' },
    rate_m90: { displayNum: '90%', unitText: 'MONTHLY', ribbon: 'starRibbon', category: 'consistency', title: '90% Monthly' },
    rate_y80: { displayNum: '80%', unitText: 'FULL YEAR', ribbon: 'starRibbon', category: 'consistency', title: '80% Annual' },
    vol_100: { displayNum: '100', unitText: 'CHECK-INS', ribbon: 'none', category: 'volume', title: '100 Check-Ins' },
    vol_500: { displayNum: '500', unitText: 'CHECK-INS', ribbon: 'ribbon', category: 'volume', title: '500 Check-Ins' },
    vol_1000: { displayNum: '1K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '1,000 Check-Ins' },
    vol_2500: { displayNum: '2.5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '2,500 Check-Ins' },
    vol_5000: { displayNum: '5K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '5,000 Check-Ins' },
    vol_10000: { displayNum: '10K', unitText: 'CHECK-INS', ribbon: 'starRibbon', category: 'volume', title: '10,000 Check-Ins' }
  },

  generateBadgeSVG(badgeId, unlocked = true) {
    const conf = this.BADGE_CATALOG[badgeId] || {
      displayNum: '★',
      unitText: 'MILESTONE',
      ribbon: 'ribbon',
      category: 'streak',
      title: 'Milestone Achieved'
    };
    const meta = this.CATEGORY_META[conf.category] || this.CATEGORY_META.streak;
    const uid = 'ub_' + String(badgeId).replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Math.random().toString(36).substring(2, 7);

    const numStr = String(conf.displayNum);
    let numClass = 'badge-svg-number';
    if (numStr.length >= 4) {
      numClass += ' badge-svg-number-xs';
    } else if (numStr.length >= 3) {
      numClass += ' badge-svg-number-small';
    }

    const yNum = conf.ribbon === 'none' ? 36 : conf.category === 'volume' ? 44 : 40;
    const yUnit = conf.ribbon === 'none' ? 72 : 75;

    let topC1 = meta.top;
    let topC2 = meta.topLight;
    let botC1 = meta.bottom;
    let botC2 = meta.bottomDark;
    let ribColor = meta.ribbon;
    let ribShadow = meta.ribbonShadow;
    let glowColor = meta.glow;

    if (!unlocked) {
      topC1 = '#181C22';
      topC2 = '#252B34';
      botC1 = '#303640';
      botC2 = '#1B2027';
      ribColor = '#343A44';
      ribShadow = '#181C22';
      glowColor = 'rgba(0,0,0,0)';
    }

    const hexD = 'M 38,0 L 92,0 Q 98,0 101,6 L 124,49 Q 127,55 124,61 L 101,104 Q 98,110 92,110 L 38,110 Q 32,110 29,104 L 6,61 Q 3,55 6,49 L 29,6 Q 32,0 38,0 Z';

    let ribbonMarkup = '';
    if (conf.ribbon === 'ribbon' || conf.ribbon === 'starRibbon') {
      const starMarkup = conf.ribbon === 'starRibbon'
        ? '<path d="M18,37 L20,42 L25,42 L21,45 L23,50 L18,47 L13,50 L15,45 L11,42 L16,42 Z" fill="#FFFFFF" fill-opacity="0.88"/><path d="M112,37 L114,42 L119,42 L115,45 L117,50 L112,47 L107,50 L109,45 L105,42 L110,42 Z" fill="#FFFFFF" fill-opacity="0.88"/>'
        : '';

      ribbonMarkup = `
        <path d="M15 44 L-30 44 L-15 59 L-30 74 L15 74 Z" fill="${ribShadow}" />
        <path d="M115 44 L160 44 L145 59 L160 74 L115 74 Z" fill="${ribShadow}" />
        <path d="M-15 59 L15 74 L15 59 Z" fill="#000000" fill-opacity="0.22" />
        <path d="M145 59 L115 74 L115 59 Z" fill="#000000" fill-opacity="0.22" />
        <path d="M-15 29 Q65 14 145 29 L145 59 Q65 44 -15 59 Z" fill="${ribColor}" filter="url(#ribbonShad_${uid})" />
        ${starMarkup}
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-35 -8 200 135" class="milestone-badge-svg ${unlocked ? 'unlocked' : 'locked'}" aria-label="${this.escapeHtml(conf.title)}">
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
            <feFlood flood-color="${glowColor}" flood-opacity="${unlocked ? '1' : '0'}" result="glowColor" />
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
          <path d="${hexD}" fill="none" stroke="${unlocked ? meta.color : '#4B5563'}" stroke-opacity="${unlocked ? '0.65' : '0.35'}" stroke-width="1.2" />
          <path d="M30 7 Q65 -1 100 7" fill="none" stroke="#FFFFFF" stroke-opacity="${unlocked ? '0.16' : '0.06'}" stroke-width="1.6" />
        </g>
        ${ribbonMarkup}
        <text x="65" y="${yNum}" class="${numClass}" fill="#FFFFFF" fill-opacity="${unlocked ? '1' : '0.45'}">${this.escapeHtml(conf.displayNum)}</text>
        <text x="65" y="${yUnit}" class="badge-svg-unit" fill="#FFFFFF" fill-opacity="${unlocked ? '0.82' : '0.35'}">${this.escapeHtml(conf.unitText)}</text>
      </svg>
    `;
  },

  // Celebratory Milestone / Badge Unlocked Modal
  showMilestoneUnlockedModal(milestone) {
    if (!milestone) return;

    if (this._isModalActive) {
      this._modalQueue.push(milestone);
      return;
    }
    this._isModalActive = true;

    this.playSound('milestone');
    if (localStorage.getItem('habitkit_confetti') !== 'false') {
      this.triggerConfetti();
    }
    this.triggerHaptic('success');

    const catMeta = (this.CATEGORY_META && this.CATEGORY_META[milestone.category]) || {
      name: milestone.category ? (milestone.category.charAt(0).toUpperCase() + milestone.category.slice(1)).replace('_', ' ') : 'Milestone',
      color: '#8B5CF6',
      glow: 'rgba(139, 92, 246, 0.35)'
    };

    let badgeSvg = '';
    if (typeof generateBadgeSVG === 'function') {
      badgeSvg = generateBadgeSVG(milestone.id, true);
    } else if (typeof this.generateBadgeSVG === 'function') {
      badgeSvg = this.generateBadgeSVG(milestone.id, true);
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open milestone-celebration-overlay';
    modal.style.zIndex = '10001';

    const safeTitle = this.escapeHtml(milestone.name || 'Milestone Achieved');
    const safeDesc = this.escapeHtml(milestone.description || 'You just achieved an incredible habit milestone!');
    const xpBonus = milestone.xpBonus || (milestone.target ? milestone.target * 10 : 50);

    modal.innerHTML = `
      <div class="modal-box animate-pop-in milestone-celebration-card" style="max-width: 360px; text-align: center; padding: 2.25rem 1.6rem; position: relative; overflow: hidden;">
        <!-- Aura Halo -->
        <div class="milestone-celebration-aura" style="background: radial-gradient(circle, ${catMeta.color} 0%, transparent 70%); top: -20px; left: calc(50% - 130px);"></div>
        
        <!-- Category Tag -->
        <div style="position: relative; z-index: 2;">
          <span style="display: inline-block; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${catMeta.color}; background: rgba(255, 255, 255, 0.05); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); border: 1px solid ${catMeta.color}55; margin-bottom: 0.75rem;">
            ${catMeta.name} MILESTONE
          </span>
        </div>

        <!-- Badge Visual Stage -->
        <div class="milestone-badge-stage">
          ${badgeSvg || `
            <div style="width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, ${catMeta.color}, #059669); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 35px ${catMeta.color}88; color: #fff;">
              <i data-lucide="award" style="width: 44px; height: 44px;"></i>
            </div>
          `}
        </div>

        <div style="position: relative; z-index: 2;">
          <div style="font-size: 0.78rem; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; color: #10b981; margin-bottom: 0.25rem;">
            CONGRATULATIONS!
          </div>
          <h2 class="milestone-celebration-title">${safeTitle}</h2>
          <p style="color: var(--text-muted); font-size: 0.84rem; line-height: 1.45; margin: 0.35rem 0 0.85rem;">${safeDesc}</p>

          <!-- XP Bonus Reward Pill -->
          <div>
            <div class="milestone-xp-reward">
              <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
              <span>+${xpBonus} XP Bonus Earned</span>
            </div>
          </div>

          <button class="btn btn-primary" id="milestoneClaimBtn" style="width: 100%; min-height: 46px; font-weight: 800; letter-spacing: 0.01em;">
            Awesome!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide && lucide.createIcons) lucide.createIcons();

    const closeModal = () => {
      modal.classList.add('closing');
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        this._isModalActive = false;
        if (this._modalQueue.length > 0) {
          const next = this._modalQueue.shift();
          setTimeout(() => this.showMilestoneUnlockedModal(next), 220);
        }
      }, 200);
    };

    const claimBtn = modal.querySelector('#milestoneClaimBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        this.playSound('click');
        closeModal();
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  },

  triggerConfetti() {
    const colors = ['#10B981', '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', '#3B82F6', '#F43F5E'];
    for (let i = 0; i < 48; i++) {
      const p = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 5;
      const isSquare = Math.random() > 0.5;
      p.style.position = 'fixed';
      p.style.left = `${window.innerWidth / 2}px`;
      p.style.top = `${window.innerHeight / 2}px`;
      p.style.width = `${size}px`;
      p.style.height = `${isSquare ? size : size * 0.45}px`;
      p.style.backgroundColor = color;
      p.style.borderRadius = isSquare ? '2px' : '1px';
      p.style.pointerEvents = 'none';
      p.style.zIndex = '10002';
      document.body.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 140 + 70;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 60;

      let posX = window.innerWidth / 2;
      let posY = window.innerHeight / 2;
      let opacity = 1;
      let rot = Math.random() * 360;

      const anim = setInterval(() => {
        posX += vx * 0.055;
        posY += vy * 0.055 + 1.8;
        rot += 9;
        opacity -= 0.024;
        p.style.left = `${posX}px`;
        p.style.top = `${posY}px`;
        p.style.transform = `rotate(${rot}deg)`;
        p.style.opacity = opacity;

        if (opacity <= 0) {
          clearInterval(anim);
          p.remove();
        }
      }, 16);
    }
  },

  generateGridDays(totalDays = 60) {
    const days = [];
    const today = new Date();
    const todayStr = this.getTodayStr();

    const todayDayOfWeek = today.getDay();
    const daysToInclude = totalDays + (6 - todayDayOfWeek);

    for (let i = daysToInclude - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i + (6 - todayDayOfWeek));
      
      const dateStr = this.formatYMD(d);
      const isToday = dateStr === todayStr;
      const isFuture = d > today && !isToday;

      days.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
        isToday,
        isFuture
      });
    }

    return days;
  },

  calculateHabitStats(datesSet, frequencyDays = 7) {
    const freq = frequencyDays || 7;
    const today = new Date();
    const totalCompletions = datesSet.size;

    // 1. Calculate Streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let unit = 'd';
    let isWeekly = false;

    if (freq >= 7) {
      let tempStreak = 0;
      let checkDate = new Date(today);
      if (!datesSet.has(this.formatYMD(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (datesSet.has(this.formatYMD(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const sortedDates = Array.from(datesSet).sort();
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const [py, pm, pd] = sortedDates[i - 1].split('-').map(Number);
          const [cy, cm, cd] = sortedDates[i].split('-').map(Number);
          const diffDays = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) tempStreak++;
          else if (diffDays > 1) tempStreak = 1;
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }
    } else {
      isWeekly = true;
      unit = 'w';
      const weeksMap = new Map();
      datesSet.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const weekStart = new Date(dateObj);
        weekStart.setDate(dateObj.getDate() - dateObj.getDay());
        const weekKey = this.formatYMD(weekStart);
        weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
      });

      const curWeekStart = new Date(today);
      curWeekStart.setDate(today.getDate() - today.getDay());
      const curWeekKey = this.formatYMD(curWeekStart);

      let currentWeeklyStreak = 0;
      let checkWeek = new Date(curWeekStart);

      const curWeekCount = weeksMap.get(curWeekKey) || 0;
      if (curWeekCount >= freq) {
        currentWeeklyStreak++;
        checkWeek.setDate(checkWeek.getDate() - 7);
      } else {
        checkWeek.setDate(checkWeek.getDate() - 7);
      }

      while (true) {
        const wKey = this.formatYMD(checkWeek);
        const count = weeksMap.get(wKey) || 0;
        if (count >= freq) {
          currentWeeklyStreak++;
          checkWeek.setDate(checkWeek.getDate() - 7);
        } else {
          break;
        }
      }

      const sortedWeekKeys = Array.from(weeksMap.keys()).sort();
      let longestWeeklyStreak = 0;
      let tempWStreak = 0;

      for (let i = 0; i < sortedWeekKeys.length; i++) {
        const wKey = sortedWeekKeys[i];
        const count = weeksMap.get(wKey) || 0;

        if (count >= freq) {
          if (tempWStreak === 0) {
            tempWStreak = 1;
          } else {
            const [py, pm, pd] = sortedWeekKeys[i - 1].split('-').map(Number);
            const [cy, cm, cd] = wKey.split('-').map(Number);
            const diffWeeks = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / (7 * 24 * 3600 * 1000));
            if (diffWeeks === 1) tempWStreak++;
            else tempWStreak = 1;
          }
          if (tempWStreak > longestWeeklyStreak) longestWeeklyStreak = tempWStreak;
        } else {
          tempWStreak = 0;
        }
      }

      currentStreak = currentWeeklyStreak;
      longestStreak = Math.max(longestWeeklyStreak, currentWeeklyStreak);
    }

    // 2. Weekly Quota
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    let thisWeekCompleted = 0;
    for (let i = 0; i <= today.getDay(); i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (datesSet.has(this.formatYMD(d))) thisWeekCompleted++;
    }
    const isTargetMetThisWeek = thisWeekCompleted >= freq;

    // 3. Current Month Rate (days logged in current month / total days in current month)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    let currentMonthCompleted = 0;
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      if (datesSet.has(dateStr)) currentMonthCompleted++;
    }
    const completionRate = totalDaysInMonth > 0 ? Math.round((currentMonthCompleted / totalDaysInMonth) * 100) : 0;

    return {
      currentStreak,
      longestStreak,
      streakUnit: unit,
      isWeeklyStreak: isWeekly,
      totalCompletions,
      completionRate,
      thisWeekCompleted,
      thisWeekTarget: freq,
      isTargetMetThisWeek
    };
  }
};

if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Utils = Utils;
}

// Unregister any legacy PWA Service Workers and clear caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}
