/**
 * Committed - Online Guard Engine
 * Enforces strict online-only operation for Committed.
 * Prohibits offline usage, blocks un-synced actions, detects network drops,
 * displays a sleek, non-dismissible Offline Guard overlay, and seamlessly
 * auto-reconnects and re-syncs state when internet access is restored.
 */

(function () {
  'use strict';

  const OnlineGuard = {
    isOnline: typeof navigator !== 'undefined' ? (navigator.onLine !== false) : true,
    isChecking: false,
    overlayEl: null,
    _pingTimer: null,

    init() {
      if (typeof window === 'undefined') return;

      // Inject overlay into DOM as soon as body is available
      if (document.body) {
        this._ensureOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', () => this._ensureOverlay());
      }

      // Browser network event listeners
      window.addEventListener('offline', () => {
        console.warn('[OnlineGuard] Network disconnected (offline event).');
        this.isOnline = false;
        this.show('Network connection lost. Please reconnect to continue.');
      });

      window.addEventListener('online', () => {
        console.log('[OnlineGuard] Network connection detected (online event). Verifying reachability...');
        this.verifyAndRestore();
      });

      // Tab visibility check to catch silent disconnects
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!navigator.onLine) {
            this.show();
          } else {
            this.verifyConnectivitySilently();
          }
        }
      });

      // Immediate initial check
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.isOnline = false;
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.show());
        } else {
          this.show();
        }
      }

      // Global capture guard: block mutations if offline
      document.addEventListener('click', (e) => {
        if (!this.isOnline) {
          const interactive = e.target.closest('button, .grid-tile, .today-check-circle, .detail-month-tile, .btn, input, select');
          if (interactive && !interactive.closest('#onlineGuardOverlay')) {
            e.preventDefault();
            e.stopPropagation();
            this.show();
          }
        }
      }, true);
    },

    _ensureOverlay() {
      if (this.overlayEl && document.getElementById('onlineGuardOverlay')) {
        return this.overlayEl;
      }

      let overlay = document.getElementById('onlineGuardOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'onlineGuardOverlay';
        overlay.className = 'online-guard-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'onlineGuardTitle');

        overlay.innerHTML = `
          <div class="online-guard-card" id="onlineGuardCard">
            <div class="online-guard-radar">
              <div class="online-guard-radar-ring"></div>
              <div class="online-guard-radar-ring delay"></div>
              <div class="online-guard-radar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="1" x2="23" y1="1" y2="23" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                  <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" x2="12.01" y1="20" y2="20" />
                </svg>
              </div>
            </div>

            <div class="online-guard-badge">
              <span class="online-guard-dot"></span>
              <span>ONLINE ONLY • LIVE CLOUD SYNC</span>
            </div>

            <h2 class="online-guard-title" id="onlineGuardTitle">Internet Connection Required</h2>
            <p class="online-guard-desc" id="onlineGuardDesc">
              Committed operates exclusively in real-time online mode. An active internet connection is required to track habits, record streaks, and synchronize your progress with Supabase. Offline mode is disabled.
            </p>

            <div class="online-guard-status-box" id="onlineGuardStatusBox">
              <div class="online-guard-status-row">
                <span class="online-guard-status-dot"></span>
                <span class="online-guard-status-text" id="onlineGuardStatusText">Status: Disconnected</span>
              </div>
              <span class="online-guard-subtext" id="onlineGuardSubtext">Committed will automatically resume once reconnected</span>
            </div>

            <button type="button" class="btn btn-primary online-guard-retry-btn" id="onlineGuardRetryBtn" onclick="OnlineGuard.retry()">
              <svg class="retry-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span class="retry-text" id="onlineGuardRetryBtnText">Retry Connection</span>
            </button>
          </div>
        `;

        document.body.appendChild(overlay);
      }

      this.overlayEl = overlay;
      return overlay;
    },

    show(customMessage) {
      this.isOnline = false;
      const overlay = this._ensureOverlay();
      if (!overlay) return;

      if (customMessage) {
        const descEl = document.getElementById('onlineGuardDesc');
        if (descEl) descEl.textContent = customMessage;
      }

      const statusBox = document.getElementById('onlineGuardStatusBox');
      const statusText = document.getElementById('onlineGuardStatusText');
      if (statusBox) {
        statusBox.className = 'online-guard-status-box';
      }
      if (statusText) {
        statusText.textContent = 'Status: Disconnected';
      }

      document.body.classList.add('online-locked');
      overlay.classList.add('open');

      // Schedule periodic background ping to auto-recover when back online
      this._startAutoReconnectPolling();
    },

    hide() {
      this.isOnline = true;
      this._stopAutoReconnectPolling();

      const overlay = this._ensureOverlay();
      if (overlay) {
        overlay.classList.remove('open');
      }
      document.body.classList.remove('online-locked');

      if (window.Utils && typeof Utils.showToast === 'function') {
        Utils.showToast('Connected • Cloud sync active', 'success', 2800);
      }

      // Automatically refresh active page state
      this._refreshActivePage();
    },

    _startAutoReconnectPolling() {
      this._stopAutoReconnectPolling();
      this._pingTimer = setInterval(() => {
        if (navigator.onLine && !this.isChecking) {
          this.checkConnection().then(ok => {
            if (ok) this.hide();
          });
        }
      }, 5000);
    },

    _stopAutoReconnectPolling() {
      if (this._pingTimer) {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
      }
    },

    async checkConnection() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

      try {
        const res = await fetch(`/health?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);
        return res.ok;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        return false;
      }
    },

    async retry() {
      if (this.isChecking) return;
      this.isChecking = true;

      const btn = document.getElementById('onlineGuardRetryBtn');
      const btnText = document.getElementById('onlineGuardRetryBtnText');
      const card = document.getElementById('onlineGuardCard');
      const statusBox = document.getElementById('onlineGuardStatusBox');
      const statusText = document.getElementById('onlineGuardStatusText');

      if (btn) btn.classList.add('loading');
      if (btnText) btnText.textContent = 'Testing connection...';
      if (statusBox) statusBox.className = 'online-guard-status-box checking';
      if (statusText) statusText.textContent = 'Status: Checking cloud link...';

      const isReachable = await this.checkConnection();

      if (isReachable) {
        if (statusBox) statusBox.className = 'online-guard-status-box connected';
        if (statusText) statusText.textContent = 'Status: Connected! Restoring sync...';
        if (btnText) btnText.textContent = 'Connected!';

        setTimeout(() => {
          this.isChecking = false;
          if (btn) btn.classList.remove('loading');
          if (btnText) btnText.textContent = 'Retry Connection';
          this.hide();
        }, 500);
      } else {
        this.isChecking = false;
        if (btn) btn.classList.remove('loading');
        if (btnText) btnText.textContent = 'Retry Connection';
        if (statusBox) statusBox.className = 'online-guard-status-box';
        if (statusText) statusText.textContent = 'Status: Still offline • Check network';

        if (card) {
          card.classList.remove('card-shake');
          void card.offsetWidth;
          card.classList.add('card-shake');
          setTimeout(() => card.classList.remove('card-shake'), 600);
        }

        if (window.Utils && typeof Utils.triggerHaptic === 'function') {
          Utils.triggerHaptic('warning');
        }
      }
    },

    async verifyAndRestore() {
      const ok = await this.checkConnection();
      if (ok) {
        this.hide();
      } else {
        this.show('Connection detected but cloud server is unreachable. Retrying...');
      }
    },

    async verifyConnectivitySilently() {
      if (!this.isOnline) return;
      const ok = await this.checkConnection();
      if (!ok) {
        this.show('Internet connection lost. Please reconnect to continue.');
      }
    },

    handleNetworkFailure(err) {
      console.warn('[OnlineGuard] Network request failed:', err);
      this.show('Network error: Unable to reach Committed cloud servers. Please verify your internet connection.');
    },

    _refreshActivePage() {
      try {
        if (typeof window.loadTodayData === 'function') {
          window.loadTodayData();
        } else if (typeof window.loadDashboard === 'function') {
          window.loadDashboard();
        } else if (typeof window.loadProgressData === 'function') {
          window.loadProgressData();
        } else if (typeof window.loadAnalytics === 'function') {
          window.loadAnalytics();
        } else if (typeof window.loadHabitDetail === 'function') {
          window.loadHabitDetail();
        } else if (typeof window.loadCategories === 'function') {
          window.loadCategories();
        }
      } catch (err) {
        console.error('[OnlineGuard] Error re-syncing page data after reconnect:', err);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.OnlineGuard = OnlineGuard;
    OnlineGuard.init();
  }
})();
