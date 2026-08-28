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

  // Global Unclipped Floating Tooltip Engine
  initGlobalTooltips() {
    let tooltipEl = document.getElementById('appGlobalTooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'appGlobalTooltip';
      document.body.appendChild(tooltipEl);
    }

    const showTooltip = (tile) => {
      const dateStr = tile.dataset.date;
      if (!dateStr) return;

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
    };

    const hideTooltip = () => {
      tooltipEl.classList.remove('visible');
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

  playSound(type = 'click') {
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
    const el = document.createElement('div');
    el.className = 'floating-xp-pill';
    el.textContent = text;
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 80, x - 30))}px`;
    el.style.top = `${y - 20}px`;
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
        <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #06b6d4); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);">
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

  triggerConfetti() {
    const colors = ['#10B981', '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 7 + 4;
      p.style.position = 'fixed';
      p.style.left = `${window.innerWidth / 2}px`;
      p.style.top = `${window.innerHeight / 2}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size * 0.6}px`;
      p.style.backgroundColor = color;
      p.style.borderRadius = '2px';
      p.style.pointerEvents = 'none';
      p.style.zIndex = '10000';
      document.body.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 40;

      let posX = window.innerWidth / 2;
      let posY = window.innerHeight / 2;
      let opacity = 1;
      let rot = 0;

      const anim = setInterval(() => {
        posX += vx * 0.06;
        posY += vy * 0.06 + 1.6;
        rot += 8;
        opacity -= 0.03;
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
  }
};
