// Committed Insights & Behavioral Intelligence Controller (Redesigned with Fixed Card Heights)

let cachedAnalyticsData = null;
let currentRadarTimeframe = '1m';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadAnalytics();
});

function initTheme() {
  const saved = localStorage.getItem('committed_theme') || localStorage.getItem('habitkit_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function handleTimeframeSwitch(tf) {
  if (!['1m', '2m', '3m'].includes(tf)) return;
  currentRadarTimeframe = tf;

  // Update pills
  document.querySelectorAll('.timeframe-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tf') === tf);
  });

  // Update subtitle
  const subEl = document.getElementById('radarHeaderSub');
  if (subEl) {
    if (tf === '1m') {
      subEl.textContent = 'Current month • Outer ring is 100%';
    } else if (tf === '2m') {
      subEl.textContent = 'Last 2 months avg • Outer ring is 100%';
    } else if (tf === '3m') {
      subEl.textContent = 'Last 3 months avg • Outer ring is 100%';
    }
  }

  if (cachedAnalyticsData && cachedAnalyticsData.habitDistribution) {
    renderHabitDistribution(cachedAnalyticsData.habitDistribution, tf);
  }
}
window.handleTimeframeSwitch = handleTimeframeSwitch;

async function loadAnalytics() {
  try {
    const res = await API.getAnalytics();
    if (!res.success || !res.analytics) return;

    const data = res.analytics;
    cachedAnalyticsData = data;
    const ov = data.overview || {};

    // 1. Stat Tiles: 2x2 grid (88px tall each)
    const consistencyScore = ov.consistencyScore || 0;
    const completionRate = ov.completionRate || 0;
    const consistencyEl = document.getElementById('ovConsistency');
    const consistencySubEl = document.getElementById('ovConsistencySub');
    if (consistencyEl) consistencyEl.textContent = `${consistencyScore}%`;
    if (consistencySubEl) consistencySubEl.textContent = `30 day average ${completionRate}%`;

    const activeHabitsEl = document.getElementById('ovActiveHabits');
    if (activeHabitsEl) activeHabitsEl.textContent = ov.activeHabits || 0;

    const delta = ov.monthlyTrendDelta || 0;
    const trendEl = document.getElementById('ovTrendDelta');
    const trendLineEl = document.getElementById('ovTrendLine');
    if (trendEl) {
      trendEl.textContent = `${delta >= 0 ? '+' : ''}${delta}%`;
      trendEl.style.color = delta > 0 ? '#10b981' : (delta < 0 ? '#f43f5e' : 'var(--text-secondary)');
    }
    if (trendLineEl) {
      trendLineEl.textContent = delta > 0 ? 'Slightly up' : (delta < 0 ? 'Slightly down' : 'No change');
    }

    const monthlyCounts = data.monthlyCounts || [];
    const currMonth = monthlyCounts.length > 0 ? monthlyCounts[monthlyCounts.length - 1] : { count: 0, month: 'This month' };
    const prevMonth = monthlyCounts.length > 1 ? monthlyCounts[monthlyCounts.length - 2] : null;

    const monthCheckInsEl = document.getElementById('ovMonthCheckIns');
    if (monthCheckInsEl) monthCheckInsEl.textContent = currMonth.count || 0;

    const lastMonthSubEl = document.getElementById('ovLastMonthSub');
    if (lastMonthSubEl) {
      if (prevMonth) {
        lastMonthSubEl.textContent = `${prevMonth.month} had ${prevMonth.count}`;
      } else {
        lastMonthSubEl.textContent = 'Last month had 0';
      }
    }

    // 2. Section "What stands out": 4 cards in 2x2 grid (110px tall each)
    renderWhatStandsOut(data.behavioralInsights || [], data.consistencyPatterns || []);

    // 3. Section "Execution curves": Two chart cards (220px tall each)
    renderVelocityCurve(data.cumulativeVelocity30);
    renderCompletionCurve(data.weekCurve);

    // 4. Section "Habit distribution": Radar chart card with 1m | 2m | 3m support
    renderHabitDistribution(data.habitDistribution, currentRadarTimeframe);

    // 5. Section "Check ins by month": Monthly bar chart (All 12 Months)
    renderMonthlyChart(data.monthlyCounts, data.totalAnnualLogs);

    // Populate preserved hidden containers for backwards-compatibility / legacy hooks
    renderInsightCards('behavioralInsightsContainer', 'behavioralDots', data.behavioralInsights);
    renderInsightCards('consistencyPatternsContainer', 'consistencyDots', data.consistencyPatterns);

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading analytics:', err);
    const container = document.querySelector('.app-container') || document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 11px; display: flex; align-items: center; justify-content: space-between;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i>
        <span>Unable to fetch analytics: ${escapeHtml(err.message || 'Connection issue')}</span>
      </div>
      <button class="btn btn-secondary" onclick="loadAnalytics()" style="padding: 0.3rem 0.6rem; font-size: 11px;">Retry</button>
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

// -----------------------------------------------------------------------------
// 2. Section "What stands out": 4 cards in 2x2 grid (110px fixed height)
// -----------------------------------------------------------------------------
function renderWhatStandsOut(behavioralInsights = [], consistencyPatterns = []) {
  const grid = document.getElementById('standsOutGrid');
  if (!grid) return;

  // Best habit (emerald)
  const bestItem = behavioralInsights.find(b => b.id === 'best_habit');

  // Needs attention (gold)
  const focusItem = behavioralInsights.find(b => b.id === 'focus_area');

  // Fastest growth (violet)
  const growthItem = behavioralInsights.find(b => b.id === 'biggest_growth');

  // Most steady (blue) - derived from streak resilience or break pattern
  const steadyPattern = consistencyPatterns.find(p => p.id === 'streak_resilience')
    || consistencyPatterns.find(p => p.id === 'break_pattern');
  let steadyHabitName = '';
  let steadyDesc = '';
  if (steadyPattern) {
    if (steadyPattern.statSub) {
      steadyHabitName = steadyPattern.statSub.replace(/ (Best Run|Streak Run)$/i, '').trim();
    }
    steadyDesc = steadyPattern.statValue
      ? `${steadyPattern.statValue} run without breaking.`
      : (steadyPattern.message || 'Strongest recurring streak resilience.');
  }

  const cards = [
    {
      label: 'Best habit',
      icon: 'award',
      color: '#10b981',
      name: bestItem ? bestItem.statValue : '',
      desc: bestItem ? (bestItem.message || bestItem.statSub) : 'Logging habits will surface your top performer.',
      hasData: Boolean(bestItem && bestItem.statValue)
    },
    {
      label: 'Needs attention',
      icon: 'target',
      color: '#f59e0b',
      name: focusItem ? focusItem.statValue : '',
      desc: focusItem ? (focusItem.message || focusItem.statSub) : 'All habits are currently on track.',
      hasData: Boolean(focusItem && focusItem.statValue)
    },
    {
      label: 'Fastest growth',
      icon: 'trending-up',
      color: '#8b5cf6',
      name: growthItem ? growthItem.statValue : '',
      desc: growthItem ? (growthItem.message || growthItem.statSub) : 'Build momentum to unlock growth trends.',
      hasData: Boolean(growthItem && growthItem.statValue)
    },
    {
      label: 'Most steady',
      icon: 'shield',
      color: '#3b82f6',
      name: steadyHabitName,
      desc: steadyDesc || 'Build a streak to discover your steady anchor.',
      hasData: Boolean(steadyHabitName)
    }
  ];

  grid.innerHTML = cards.map(c => `
    <div class="stands-out-card">
      <div class="stands-out-top">
        <i data-lucide="${c.icon}" class="stands-out-icon" style="color: ${c.color};"></i>
        <span class="stands-out-label">${c.label}</span>
      </div>
      <div class="stands-out-name" style="color: ${c.hasData ? c.color : 'var(--text-muted)'};">
        ${escapeHtml(c.hasData ? c.name : 'No habit flagged')}
      </div>
      <div class="stands-out-desc">
        ${escapeHtml(c.desc)}
      </div>
    </div>
  `).join('');
}

// Helper: Smooth Cardinal Spline / Cubic Bezier curve path generator
function getSmoothCurvePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// -----------------------------------------------------------------------------
// 3. Execution Curves: Check-in Velocity (220px card)
// -----------------------------------------------------------------------------
function renderVelocityCurve(velocityData) {
  const svg = document.getElementById('velocityCurveSvg');
  const badge = document.getElementById('velocityTotalBadge');
  if (!svg || !velocityData || velocityData.length === 0) return;

  const total = velocityData[velocityData.length - 1].cumulativeCount || 0;
  if (badge) badge.textContent = `+${total} logs`;

  const width = 320;
  const height = 135;
  const paddingX = 14;
  const paddingTop = 12;
  const paddingBottom = 26; // Leaves comfortable room for 11px x-axis text
  const chartHeight = height - paddingTop - paddingBottom;
  const maxVal = Math.max(total, 1);

  const points = velocityData.map((d, idx) => {
    const x = paddingX + (idx * ((width - paddingX * 2) / (velocityData.length - 1)));
    const y = paddingTop + chartHeight - ((d.cumulativeCount / maxVal) * chartHeight);
    return { x, y, ...d };
  });

  const pathD = getSmoothCurvePath(points);
  const bottomY = paddingTop + chartHeight;
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  const lastPoint = points[points.length - 1];

  // Flat translucent emerald fill, solid stroke, dot on last point, min 11px x-labels
  svg.innerHTML = `
    <path d="${areaD}" fill="rgba(16, 185, 129, 0.12)"/>
    <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="4.5" fill="#34d399" stroke="#07090e" stroke-width="2"/>
    <text x="${points[0].x.toFixed(1)}" y="${height - 6}" text-anchor="start" font-size="11" fill="var(--text-muted)" font-weight="600">Day 1</text>
    <text x="${points[14].x.toFixed(1)}" y="${height - 6}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-weight="600">Day 15</text>
    <text x="${points[points.length - 1].x.toFixed(1)}" y="${height - 6}" text-anchor="end" font-size="11" fill="var(--text-muted)" font-weight="600">Day 30</text>
  `;
}

// -----------------------------------------------------------------------------
// 3. Execution Curves: Weekly Execution (220px card)
// -----------------------------------------------------------------------------
function renderCompletionCurve(weekCurve) {
  const svg = document.getElementById('completionCurveSvg');
  if (!svg || !weekCurve || weekCurve.length === 0) return;

  const width = 320;
  const height = 135;
  const paddingX = 18;
  const paddingTop = 14;
  const paddingBottom = 26;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = weekCurve.map((d, idx) => {
    const x = paddingX + (idx * ((width - paddingX * 2) / (weekCurve.length - 1)));
    const y = paddingTop + chartHeight - (((d.rate || 0) / 100) * chartHeight);
    return { x, y, ...d };
  });

  const pathD = getSmoothCurvePath(points);
  const bottomY = paddingTop + chartHeight;
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;

  // Find peak day
  const peakPoint = [...points].sort((a, b) => (b.rate || 0) - (a.rate || 0))[0];
  const peakBadge = document.getElementById('curvePeakBadge');
  if (peakBadge && peakPoint) {
    peakBadge.textContent = `${peakPoint.rate}%`;
  }

  // Flat translucent violet fill, solid stroke, peak day gets bigger dot and brighter label
  svg.innerHTML = `
    <path d="${areaD}" fill="rgba(139, 92, 246, 0.12)"/>
    <path d="${pathD}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map(p => {
      const isPeak = p === peakPoint;
      return `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" 
          r="${isPeak ? 5 : 3.5}" 
          fill="${isPeak ? '#e9d5ff' : '#8b5cf6'}" 
          stroke="#07090e" 
          stroke-width="1.8"/>
        <text x="${p.x.toFixed(1)}" y="${height - 6}" 
          text-anchor="middle" 
          font-size="11" 
          fill="${isPeak ? '#e9d5ff' : 'var(--text-muted)'}" 
          font-weight="${isPeak ? '800' : '600'}">${escapeHtml(p.day)}</text>
      `;
    }).join('')}
  `;
}

// -----------------------------------------------------------------------------
// 4. Section "Habit consistency": Radar Chart (Outer ring is 100%)
// -----------------------------------------------------------------------------
function renderHabitDistribution(dist, timeframe = '1m') {
  const container = document.getElementById('habitDistributionContainer');
  if (!container) return;

  if (!dist || dist.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; padding: 1.5rem; text-align: center;">Logging habits will populate your habit consistency radar.</div>';
    return;
  }

  // Map habits using the selected timeframe metrics (1m | 2m | 3m)
  let habitsToShow = dist.map(h => {
    const tfData = (h.timeframes && h.timeframes[timeframe]) ? h.timeframes[timeframe] : null;
    return {
      ...h,
      effectivePercentage: tfData ? tfData.percentage : (h.percentage || 0),
      effectiveCount: tfData ? tfData.count : (h.count || 0),
      effectiveLabel: tfData ? tfData.label : '',
      effectiveSubtitle: tfData ? tfData.subtitle : ''
    };
  });

  // Rule: If there are more than 8 habits, show the top 8 by percent
  if (habitsToShow.length > 8) {
    habitsToShow.sort((a, b) => (b.effectivePercentage || 0) - (a.effectivePercentage || 0));
    habitsToShow = habitsToShow.slice(0, 8);
  }

  // Rule: If there are fewer than 3 habits, show a ranked bar list instead.
  if (habitsToShow.length < 3) {
    renderRankedBarList(habitsToShow, container, timeframe);
  } else {
    renderRadarHabitDistribution(habitsToShow, container, timeframe);
  }
}

function renderRadarHabitDistribution(habits, container, timeframe = '1m') {
  const N = habits.length;
  const width = 380;
  const height = 270;
  const cx = width / 2;
  const cy = 135;
  const radius = 80;

  const angles = habits.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / N);

  // Outer ring is strictly 100%. Data values mapped to 100%.
  const dataPoints = habits.map((item, i) => {
    const angle = angles[i];
    const rawPct = Math.round(item.effectivePercentage || 0);
    const clampedPct = Math.min(100, Math.max(0, rawPct));
    const r = (clampedPct / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y, rawPct, item, angle };
  });

  const polygonPointsStr = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Concentric rings at 25%, 50%, 75%, 100%. Outer ring is 100%.
  const rings = [25, 50, 75, 100];
  const gridPolygonsHtml = rings.map(level => {
    const rL = (level / 100) * radius;
    const pts = angles.map(angle => {
      const x = cx + rL * Math.cos(angle);
      const y = cy + rL * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const isOuter = level === 100;
    return `
      <polygon points="${pts}" 
        fill="${isOuter ? 'rgba(16, 185, 129, 0.03)' : 'none'}" 
        stroke="${isOuter ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.1)'}" 
        stroke-width="${isOuter ? '1.5' : '1'}" 
        stroke-dasharray="${isOuter ? 'none' : '3 3'}" 
      />
      <text x="${cx + 4}" y="${(cy - rL + 3.5).toFixed(1)}" 
        font-size="10" font-weight="700" fill="var(--text-muted)">${level}%</text>
    `;
  }).join('');

  // Spokes from center
  const spokesHtml = angles.map(angle => {
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    return `
      <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" 
        stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" stroke-dasharray="2 3" />
    `;
  }).join('');

  // Outside axis labels: habit name in white, percent in emerald underneath
  const labelRadius = radius + 22;
  const labelsHtml = dataPoints.map(dp => {
    const angle = dp.angle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    let lx = cx + labelRadius * cosA;
    let ly = cy + labelRadius * sinA;

    let textAnchor = 'middle';
    if (cosA > 0.25) {
      textAnchor = 'start';
      lx += 4;
    } else if (cosA < -0.25) {
      textAnchor = 'end';
      lx -= 4;
    }

    if (sinA < -0.65) ly -= 5;
    else if (sinA > 0.65) ly += 6;

    const rawTitle = dp.item.title || 'Habit';
    const cleanTitle = rawTitle.length > 11 ? rawTitle.slice(0, 10) + '…' : rawTitle;

    return `
      <g class="radar-axis-label-group">
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${textAnchor}" dominant-baseline="central">
          <tspan x="${lx.toFixed(1)}" dy="-7" font-size="11" font-weight="700" fill="#ffffff">${escapeHtml(cleanTitle)}</tspan>
          <tspan x="${lx.toFixed(1)}" dy="14" font-size="11" font-weight="800" fill="#10b981">${dp.rawPct}%</tspan>
        </text>
      </g>
    `;
  }).join('');

  // Dot on each vertex
  const dataDotsHtml = dataPoints.map(dp => `
    <circle cx="${dp.x.toFixed(1)}" cy="${dp.y.toFixed(1)}" r="4" 
      fill="#34d399" stroke="#07090e" stroke-width="2" />
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
      <defs>
        <filter id="radarEmeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.35"/>
        </filter>
      </defs>
      <!-- Grid rings -->
      ${gridPolygonsHtml}
      <!-- Spokes -->
      ${spokesHtml}
      <!-- Translucent emerald fill & solid emerald stroke with subtle glow -->
      <polygon points="${polygonPointsStr}" 
        fill="rgba(16, 185, 129, 0.22)" 
        stroke="#10b981" 
        stroke-width="2.2" 
        stroke-linejoin="round" 
        filter="url(#radarEmeraldGlow)"
      />
      <!-- Vertex dots -->
      ${dataDotsHtml}
      <!-- Outside axis labels -->
      ${labelsHtml}
    </svg>
  `;
}

// Fallback for < 3 habits: Ranked Bar List with Timeframe Support
function renderRankedBarList(habits, container, timeframe = '1m') {
  if (!habits || habits.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; padding: 1.5rem; text-align: center;">Logging habits will populate your habit consistency breakdown.</div>';
    return;
  }
  const sorted = [...habits].sort((a, b) => (b.effectivePercentage || 0) - (a.effectivePercentage || 0));
  container.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 0.85rem; padding: 0.5rem 0.25rem;">
      ${sorted.map(h => {
        const pct = Math.min(100, Math.max(0, Math.round(h.effectivePercentage || 0)));
        const detailSub = h.effectiveLabel ? ` • ${h.effectiveLabel}` : '';
        return `
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
              <span style="font-weight: 700; color: #ffffff;">${escapeHtml(h.title)} <span style="font-weight: 500; font-size: 10.5px; color: var(--text-muted);">${escapeHtml(detailSub)}</span></span>
              <span style="font-weight: 800; color: #10b981;">${pct}%</span>
            </div>
            <div style="width: 100%; height: 7px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 999px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 5. Section "Check ins by month": Monthly Bar Chart (All 12 Months)
// -----------------------------------------------------------------------------
function renderMonthlyChart(monthlyCounts, totalAnnualLogs) {
  const container = document.getElementById('monthlyChartContainer');
  const footerEl = document.getElementById('monthlyChartFooter');
  if (!container || !monthlyCounts || monthlyCounts.length === 0) return;

  const maxCount = Math.max(...monthlyCounts.map(m => m.count), 1);
  const bestMonthItem = [...monthlyCounts].sort((a, b) => b.count - a.count)[0];
  const currentMonthIdx = monthlyCounts.length - 1;
  const totalLogs = (typeof totalAnnualLogs === 'number') 
    ? totalAnnualLogs 
    : monthlyCounts.reduce((acc, m) => acc + (m.count || 0), 0);

  container.innerHTML = monthlyCounts.map((item, idx) => {
    const isCurrent = idx === currentMonthIdx;
    const hasData = item.count > 0;
    const heightPercent = hasData ? Math.max(12, Math.round((item.count / maxCount) * 100)) : 4;
    const barBg = isCurrent 
      ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
      : (hasData ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.08)');

    return `
      <div class="monthly-bar-item ${isCurrent ? 'is-current' : ''}" title="${escapeHtml(item.month)} ${item.year || ''}: ${item.count} check-ins">
        <div class="monthly-bar-val">${item.count}</div>
        <div class="monthly-bar-track">
          <div class="monthly-bar-fill" style="height: ${heightPercent}%; background: ${barBg};"></div>
        </div>
        <span class="monthly-bar-label">${escapeHtml(item.month)}</span>
      </div>
    `;
  }).join('');

  if (footerEl) {
    const bestText = (bestMonthItem && bestMonthItem.count > 0)
      ? `<span><strong style="color: #10b981;">${escapeHtml(bestMonthItem.month)}</strong> was your best month (${bestMonthItem.count} check-ins)</span>`
      : `<span>Log check-ins to track your monthly peak</span>`;
    const totalText = `<span style="color: var(--text-secondary);">${totalLogs} total check-ins in past 12 months</span>`;
    footerEl.innerHTML = `${bestText}${totalText}`;
  }
}

// -----------------------------------------------------------------------------
// Preserved Code for Unshown Sections (Populates hidden containers)
// -----------------------------------------------------------------------------
function renderInsightCards(containerId, dotsId, list) {
  const container = document.getElementById(containerId);
  const dotsContainer = document.getElementById(dotsId);
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; padding: 0.75rem;">Logging consistently will unlock more behavioral intelligence.</div>';
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

function scrollCarousel(containerId, direction) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const firstCard = container.querySelector('.insight-card-item');
  const scrollAmount = firstCard ? (firstCard.offsetWidth + 12) : 260;
  container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

function setupSwipeCarousel(container, dotsContainer) {
  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  dots.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const card = container.children[idx];
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  });

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
