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

    // 1. Action Needed: Streak at Risk
    renderStreakRiskBanner(data.streakRisks);

    // 2. Overview 4-Cards
    document.getElementById('ovConsistency').textContent = `${ov.consistencyScore || 0}%`;
    document.getElementById('ovCompletionRate').textContent = `${ov.completionRate || 0}%`;
    document.getElementById('ovActiveHabits').textContent = ov.activeHabits || 0;
    
    const delta = ov.monthlyTrendDelta || 0;
    const trendEl = document.getElementById('ovTrendDelta');
    if (trendEl) {
      trendEl.textContent = `${delta >= 0 ? '+' : ''}${delta}%`;
      trendEl.style.color = delta >= 0 ? '#10b981' : '#f43f5e';
    }

    // 3. Habit Analytics: Best Days & Completion Rate
    renderBestDaysBars(data.bestDays);
    renderCompletionCurve(data.weekCurve);

    // 4. Behavioral Insights: Best Habit, Focus Area, Strongest Habit, Stable Anchor
    renderInsightCards('behavioralInsightsContainer', data.behavioralInsights);

    // 5. Consistency Patterns: Monthly Consistency, Break Pattern, Bounce-Back Speed, Streak Resilience
    renderInsightCards('consistencyPatternsContainer', data.consistencyPatterns);

    // 6. History: Monthly Check-ins Chart
    renderMonthlyChart(data.monthlyCounts);

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function renderStreakRiskBanner(risks) {
  const container = document.getElementById('streakRiskContainer');
  if (!container) return;

  if (!risks || risks.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = risks.map(r => `
    <div class="insight-risk-banner animate-fade-in" style="margin-bottom: 1.15rem;">
      <div class="insight-risk-icon">
        <i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 0.78rem; font-weight: 800; color: #f43f5e; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.15rem;">ACTION NEEDED</div>
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${r.message}</div>
      </div>
      <div class="insight-stat-badge" style="border-color: rgba(244, 63, 94, 0.4);">
        <div class="insight-stat-val" style="color: #f43f5e;">${r.streak}d</div>
        <div class="insight-stat-sub">Streak</div>
      </div>
    </div>
  `).join('');
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

function renderInsightCards(containerId, list) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 0.75rem;">Logging consistently will unlock more behavioral intelligence.</div>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="insight-card-item animate-fade-in" style="margin-bottom: 0.65rem;">
      <div class="insight-card-left">
        <div class="insight-icon-box" style="background-color: ${item.color}22; color: ${item.color};">
          <i data-lucide="${item.icon || 'zap'}" style="width: 18px; height: 18px;"></i>
        </div>
        <div>
          <div class="insight-title-line">${item.title}</div>
          <div class="insight-message-text">${item.message}</div>
        </div>
      </div>
      ${item.statValue ? `
        <div class="insight-stat-badge">
          <div class="insight-stat-val" style="color: ${item.color};">${item.statValue}</div>
          <div class="insight-stat-sub">${item.statSub || 'Metric'}</div>
        </div>
      ` : ''}
    </div>
  `).join('');
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
