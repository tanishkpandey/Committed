// Committed Insights & Behavioral Intelligence Controller

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadAnalytics();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme' || localStorage.getItem('habitkit_theme')) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

async function loadAnalytics() {
  try {
    const res = await API.getAnalytics();
    if (!res.success || !res.analytics) return;

    const data = res.analytics;
    const ov = data.overview || {};

    // 1. Overview 4-Cards
    document.getElementById('ovConsistency').textContent = `${ov.consistencyScore || 0}%`;
    document.getElementById('ovCompletionRate').textContent = `${ov.completionRate || 0}%`;
    document.getElementById('ovActiveHabits').textContent = ov.activeHabits || 0;
    
    const delta = ov.monthlyTrendDelta || 0;
    const trendEl = document.getElementById('ovTrendDelta');
    if (trendEl) {
      trendEl.textContent = `${delta >= 0 ? '+' : ''}${delta}%`;
      trendEl.style.color = delta >= 0 ? '#10b981' : '#f43f5e';
    }

    // 2. Habit Analytics: 30-Day Velocity & 7-Day Completion Rate
    renderVelocityCurve(data.cumulativeVelocity30);
    renderCompletionCurve(data.weekCurve);

    // 3. Habit Distribution: Subtle Neon Glow Donut & Breakdown
    renderHabitDistribution(data.habitDistribution);

    // 4. Behavioral Insights: Swipeable Cards on Mobile
    renderInsightCards('behavioralInsightsContainer', 'behavioralDots', data.behavioralInsights);

    // 5. Consistency Patterns: Swipeable Cards on Mobile
    renderInsightCards('consistencyPatternsContainer', 'consistencyDots', data.consistencyPatterns);

    // 6. History: Monthly Check-ins Chart
    renderMonthlyChart(data.monthlyCounts);

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading analytics:', err);
    const container = document.querySelector('.app-container') || document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i>
        <span>Unable to fetch analytics from Supabase: ${escapeHtml(err.message || 'Connection issue')}</span>
      </div>
      <button class="btn btn-secondary" onclick="loadAnalytics()" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Retry</button>
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

function renderVelocityCurve(velocityData) {
  const svg = document.getElementById('velocityCurveSvg');
  const badge = document.getElementById('velocityTotalBadge');
  if (!svg || !velocityData || velocityData.length === 0) return;

  const total = velocityData[velocityData.length - 1].cumulativeCount || 0;
  if (badge) badge.textContent = `+${total} Logs`;

  const width = 300;
  const height = 90;
  const padding = 15;
  const maxVal = Math.max(total, 1);

  const points = velocityData.map((d, idx) => {
    const x = padding + (idx * ((width - padding * 2) / (velocityData.length - 1)));
    const y = height - padding - ((d.cumulativeCount / maxVal) * (height - padding * 2));
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const lastPoint = points[points.length - 1];

  svg.innerHTML = `
    <defs>
      <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10B981" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#velocityGrad)"/>
    <path d="${pathD}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="4.5" fill="#34D399" stroke="#0b0f19" stroke-width="1.5"/>
    <text x="${points[0].x}" y="${height + 15}" text-anchor="start" font-size="9" fill="#94A3B8" font-weight="700">Day 1</text>
    <text x="${points[14].x}" y="${height + 15}" text-anchor="middle" font-size="9" fill="#94A3B8" font-weight="700">Day 15</text>
    <text x="${points[29].x}" y="${height + 15}" text-anchor="end" font-size="9" fill="#94A3B8" font-weight="700">Day 30</text>
  `;
}

function renderHabitDistribution(dist) {
  const container = document.getElementById('habitDistributionContainer');
  if (!container || !dist) return;

  if (dist.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 1.5rem; text-align: left;">Logging habits over 30 days will populate your execution share.</div>';
    return;
  }

  const totalLogs = dist.reduce((acc, h) => acc + h.count, 0);

  // Calculate SVG donut segments with neon glow
  const size = 160;
  const center = size / 2;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = dist.map(item => {
    const pct = totalLogs > 0 ? item.count / totalLogs : 0;
    const strokeDash = Math.max(2, pct * circumference);
    const strokeOffset = -cumulativeOffset;
    cumulativeOffset += strokeDash;

    return `
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none"
        stroke="${item.color}" stroke-width="15" stroke-linecap="round"
        stroke-dasharray="${Math.max(1, strokeDash - 3)} ${circumference - Math.max(1, strokeDash - 3)}"
        stroke-dashoffset="${strokeOffset}"
        transform="rotate(-90 ${center} ${center})"
        style="filter: drop-shadow(0 0 6px ${item.color}88); transition: stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);"></circle>
    `;
  }).join('');

  container.innerHTML = `
    <div class="neon-donut-layout">
      <div class="neon-donut-visual">
        <svg viewBox="0 0 ${size} ${size}" class="neon-donut-svg">
          <!-- Background track -->
          <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="15"></circle>
          
          <!-- Colored glowing segments -->
          ${segments}
          
          <!-- Inner Core -->
          <circle cx="${center}" cy="${center}" r="38" fill="var(--bg-card)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));"></circle>
          
          <!-- Center Metric -->
          <text x="${center}" y="${center - 3}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="900" fill="var(--text-primary)" letter-spacing="-0.03em">${totalLogs}</text>
          <text x="${center}" y="${center + 14}" text-anchor="middle" dominant-baseline="middle" font-size="7.5" font-weight="800" fill="var(--text-muted)" letter-spacing="1.5px">TOTAL LOGS</text>
        </svg>
      </div>

      <div class="neon-donut-breakdown">
        <div class="neon-donut-grid">
          ${dist.map(item => `
            <div class="neon-breakdown-card">
              <div class="neon-breakdown-header">
                <div class="neon-breakdown-left">
                  <span class="neon-glow-dot" style="background: ${item.color}; box-shadow: 0 0 10px ${item.color};"></span>
                  <span class="neon-habit-title" title="${item.title}">${item.title}</span>
                </div>
                <div class="neon-pct-pill" style="background: ${item.color}15; color: ${item.color}; border: 1px solid ${item.color}40; box-shadow: 0 0 8px ${item.color}20;">
                  ${item.percentage}%
                </div>
              </div>
              <div class="neon-bar-track">
                <div class="neon-bar-fill" style="width: ${item.percentage}%; background: ${item.color}; box-shadow: 0 0 8px ${item.color};"></div>
              </div>
              <div class="neon-sub-logs">${item.count} check-in${item.count === 1 ? '' : 's'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCompletionCurve(weekCurve) {
  const svg = document.getElementById('completionCurveSvg');
  if (!svg || !weekCurve || weekCurve.length === 0) return;

  const width = 300;
  const height = 90;
  const padding = 15;

  const points = weekCurve.map((d, idx) => {
    const x = padding + (idx * ((width - padding * 2) / (weekCurve.length - 1)));
    const y = height - padding - ((d.rate / 100) * (height - padding * 2));
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const peakPoint = [...points].sort((a, b) => b.rate - a.rate)[0];
  const peakBadge = document.getElementById('curvePeakBadge');
  if (peakBadge) peakBadge.textContent = `${peakPoint.rate}%`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#areaGrad)"/>
    <path d="${pathD}" fill="none" stroke="#A855F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="${p === peakPoint ? 4.5 : 3}" fill="${p === peakPoint ? '#C084FC' : '#8B5CF6'}" stroke="#0b0f19" stroke-width="1.5"/>
      <text x="${p.x}" y="${height + 15}" text-anchor="middle" font-size="9" fill="#94A3B8" font-weight="700">${p.day}</text>
    `).join('')}
  `;
}

function renderInsightCards(containerId, dotsId, list) {
  const container = document.getElementById(containerId);
  const dotsContainer = document.getElementById(dotsId);
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 0.75rem;">Logging consistently will unlock more behavioral intelligence.</div>';
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  container.innerHTML = list.map((item, idx) => `
    <div class="insight-card-item modern animate-fade-in" data-index="${idx}">
      <div class="insight-card-top">
        <div class="insight-icon-box" style="background-color: ${item.color}18; color: ${item.color};">
          <i data-lucide="${item.icon || 'award'}" style="width: 15px; height: 15px;"></i>
        </div>
        <div class="insight-title-line">${item.title}</div>
      </div>
      
      ${item.statValue ? `
        <div class="insight-hero-stat-group">
          <div class="insight-hero-stat-val" style="color: ${item.color};">${item.statValue}</div>
          <div class="insight-hero-stat-sub">${item.statSub || 'Metric'}</div>
        </div>
      ` : ''}

      <div class="insight-message-text">${item.message}</div>
    </div>
  `).join('');

  if (dotsContainer && list.length > 1) {
    dotsContainer.innerHTML = list.map((_, idx) => `
      <button class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Go to slide ${idx + 1}"></button>
    `).join('');

    setupSwipeCarousel(container, dotsContainer);
  } else if (dotsContainer) {
    dotsContainer.innerHTML = '';
  }
}

function setupSwipeCarousel(container, dotsContainer) {
  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  // Dot click navigation
  dots.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const card = container.children[idx];
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  });

  // Real-time scroll indicator synchronization
  let scrollTimeout = null;
  const updateDots = () => {
    const scrollLeft = container.scrollLeft;
    const firstCard = container.children[0];
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 12;
    const activeIdx = Math.min(dots.length - 1, Math.max(0, Math.round(scrollLeft / cardWidth)));

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });
  };

  container.addEventListener('scroll', () => {
    if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
    scrollTimeout = requestAnimationFrame(updateDots);
  }, { passive: true });

  // Spring momentum swipe dragging
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  container.addEventListener('touchstart', (e) => {
    isDown = true;
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - startX);
    container.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isDown = false;
  }, { passive: true });
}

function renderMonthlyChart(monthlyCounts) {
  const container = document.getElementById('monthlyChartContainer');
  if (!container || !monthlyCounts) return;

  const maxCount = Math.max(...monthlyCounts.map(m => m.count), 1);

  container.innerHTML = monthlyCounts.map(item => {
    const heightPercent = Math.max(12, Math.round((item.count / maxCount) * 100));
    return `
      <div class="monthly-bar-item">
        <div class="monthly-bar-val">${item.count}</div>
        <div style="height: 100px; width: 100%; display: flex; align-items: flex-end; justify-content: center;">
          <div style="width: 65%; height: ${heightPercent}%; background: linear-gradient(180deg, #8b5cf6, #ec4899); border-radius: 4px 4px 2px 2px; transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);"></div>
        </div>
        <span style="font-size: 0.72rem; font-weight: 750; color: var(--text-secondary);">${item.month}</span>
      </div>
    `;
  }).join('');
}
