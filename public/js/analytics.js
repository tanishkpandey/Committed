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

    // 2. Habit Analytics: Best Days & Completion Rate Curve
    renderBestDaysBars(data.bestDays);
    renderCompletionCurve(data.weekCurve);

    // 3. Behavioral Insights: Swipeable Cards on Mobile
    renderInsightCards('behavioralInsightsContainer', 'behavioralDots', data.behavioralInsights);

    // 4. Consistency Patterns: Swipeable Cards on Mobile
    renderInsightCards('consistencyPatternsContainer', 'consistencyDots', data.consistencyPatterns);

    // 5. History: Monthly Check-ins Chart
    renderMonthlyChart(data.monthlyCounts);

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function renderBestDaysBars(bestDays) {
  const container = document.getElementById('bestDaysBarsContainer');
  if (!container || !bestDays) return;

  container.innerHTML = bestDays.map(item => `
    <div class="best-day-col">
      <div class="best-day-pct-label">${item.rate}%</div>
      <div class="best-day-bar-track">
        <div class="best-day-bar-fill" style="height: ${item.rate}%;"></div>
      </div>
      <div class="best-day-name">${item.day}</div>
    </div>
  `).join('');
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
