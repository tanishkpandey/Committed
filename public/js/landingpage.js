/**
 * Committed - Public Landing Page Script
 * Interactive contribution heatmap and dynamic auth button switcher.
 * Checks /auth/status:
 *   - If signed in: renders "Open app" linking to /
 *   - If signed out: renders Google sign-in button linking to /auth/google
 */

(function () {
  'use strict';

  const GOOGLE_ICON_SVG = `
    <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    initSampleHeatmap();
    initAuthButtons();
    checkAuthError();
  });

  /**
   * Queries /auth/status to toggle between Google Sign-in and Open App
   */
  async function initAuthButtons() {
    const buttons = document.querySelectorAll('.btn-open-app');
    if (!buttons.length) return;

    try {
      const res = await fetch('/auth/status', { cache: 'no-store' });
      const data = await res.json().catch(() => null);

      if (data && data.authenticated) {
        // Logged-in user: show "Open app" linking to /
        buttons.forEach(btn => {
          btn.href = '/';
          btn.classList.remove('btn-google');
          btn.innerHTML = '<span>Open app</span>';
        });
      } else {
        // Logged-out visitor: show Google Sign In button linking to /auth/google
        buttons.forEach(btn => {
          btn.href = '/auth/google';
          btn.classList.add('btn-google');
          const isSmall = btn.classList.contains('btn-open-app-sm');
          const label = isSmall ? 'Sign in with Google' : 'Continue with Google';
          btn.innerHTML = `${GOOGLE_ICON_SVG}<span>${label}</span>`;
        });
      }
    } catch (err) {
      console.warn('[Landing Page] Could not fetch auth status:', err);
      // Fallback to Google sign in
      buttons.forEach(btn => {
        btn.href = '/auth/google';
        btn.classList.add('btn-google');
        btn.innerHTML = `${GOOGLE_ICON_SVG}<span>Sign in with Google</span>`;
      });
    }
  }

  function checkAuthError() {
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error');
    if (errorMsg) {
      console.error('[Auth Error from URL]', errorMsg);
      const alertBox = document.createElement('div');
      alertBox.className = 'lp-auth-error-banner';
      alertBox.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Authentication failed: ${escapeHtml(errorMsg)}. Please try again.</span>
      `;
      document.body.prepend(alertBox);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  /**
   * Generates a 20-week (140-day) realistic contribution heatmap using fake sample data.
   */
  function initSampleHeatmap() {
    const container = document.getElementById('lpHeroHeatmapSvg');
    if (!container) return;

    const weeks = 20;
    const daysPerWeek = 7;
    const cellSize = 11.5;
    const cellGap = 3.5;
    const monthHeaderHeight = 16;
    const dayLabelWidth = 24;

    const totalWidth = dayLabelWidth + weeks * (cellSize + cellGap);
    const totalHeight = monthHeaderHeight + daysPerWeek * (cellSize + cellGap);

    container.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    // Emerald heatmap tiers matching Committed's palette
    const colors = [
      '#151a24', // Level 0 (not logged)
      '#064e3b', // Level 1 (25% effort)
      '#047857', // Level 2 (50% effort)
      '#059669', // Level 3 (75% effort)
      '#10b981'  // Level 4 (100% completed)
    ];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const monthStep = Math.floor(weeks / monthNames.length);

    let svgHtml = '';

    // Render month header labels
    for (let m = 0; m < monthNames.length; m++) {
      const x = dayLabelWidth + m * monthStep * (cellSize + cellGap);
      svgHtml += `
        <text x="${x}" y="10" fill="#64748b" font-size="9" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600">
          ${monthNames[m]}
        </text>
      `;
    }

    // Render day labels (Mon, Wed, Fri)
    const dayLabels = [
      { text: 'M', row: 1 },
      { text: 'W', row: 3 },
      { text: 'F', row: 5 }
    ];
    dayLabels.forEach(d => {
      const y = monthHeaderHeight + d.row * (cellSize + cellGap) + cellSize - 2.5;
      svgHtml += `
        <text x="6" y="${y}" fill="#64748b" font-size="8.5" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600">
          ${d.text}
        </text>
      `;
    });

    // Deterministic pseudo-random seed for clean, consistent sample data
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let w = 0; w < weeks; w++) {
      const x = dayLabelWidth + w * (cellSize + cellGap);

      for (let d = 0; d < daysPerWeek; d++) {
        const y = monthHeaderHeight + d * (cellSize + cellGap);
        const dayIndex = w * 7 + d;

        let level = 0;
        const rand = pseudoRandom();

        // Recent 6 weeks show a strong, unbroken streak
        if (w >= weeks - 6) {
          level = rand > 0.35 ? 4 : 3;
        } else if (w >= weeks - 12) {
          if (rand > 0.45) level = 3;
          else if (rand > 0.20) level = 2;
          else if (rand > 0.08) level = 1;
          else level = 0;
        } else {
          if (rand > 0.60) level = 2;
          else if (rand > 0.35) level = 1;
          else level = 0;
        }

        const color = colors[level];

        svgHtml += `
          <rect 
            x="${x}" 
            y="${y}" 
            width="${cellSize}" 
            height="${cellSize}" 
            rx="3" 
            ry="3" 
            fill="${color}" 
            stroke="rgba(255, 255, 255, 0.06)" 
            stroke-width="0.5"
          >
            <title>Day ${dayIndex + 1}: ${level > 0 ? 'Completed (+10 XP)' : 'Not logged'}</title>
          </rect>
        `;
      }
    }

    container.innerHTML = svgHtml;
  }
})();
