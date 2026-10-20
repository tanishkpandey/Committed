# Mobile UI & UX Audit & Standardization Directive

## Goal
Standardize and optimize the frontend for high-retention mobile users (95% mobile user base), ensuring tactile ergonomics, safe area compliance, seamless bottom navigation, native-feeling bottom sheets, and responsive performance.

## Core Mobile Requirements & Checkpoints
1. **Safe Area & Viewport**:
   - Every page must specify: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
   - Include `<meta name="theme-color" content="#0a0c10" id="themeColorMeta">` and dynamic sync on theme toggle.
   - PWA / iOS standalone status bar: `apple-mobile-web-app-status-bar-style` set to `black-translucent`.
   - Padding on `.app-container` must utilize `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

2. **Touch Targets & Thumb Zone**:
   - Minimum interactive dimensions: 44x44px to 48x48px (Fitts's Law / Apple HIG / Android Material).
   - Habits quick check toggle: 40px visual size with expanded 48px hit area via pseudo-element.
   - Category management buttons & modal dismiss buttons: minimum 40-44px touch targets.
   - Habit card title group: entire header info group navigates to habit detail on tap.

3. **Bottom Navigation**:
   - Uniform 5-tab structure across all pages: Habits (`/`), Progress (`/progress.html`), Studio (`/manage-habits.html`), Insights (`/analytics.html`), Settings (`/settings.html`).
   - Active tab highlighted with subtle glowing pill background and elevated label contrast.
   - Elevated fixed position with background blur (`backdrop-filter: blur(16px)`).

4. **Native Mobile Bottom Sheets**:
   - Modals open from bottom (`transform: translateY(100%) -> translateY(0)`).
   - Distinctive `.sheet-drag-handle` indicator at top of every modal box.

5. **Haptic & Sound Feedback**:
   - Support `navigator.vibrate` with graceful fallback when hardware is absent or disabled.
   - Settings toggle for enabling/disabling device vibration.
   - Non-blocking mobile toasts replacing native `alert()` dialogs.

## Execution Tools
- `execution/standardize_all_pages.py`: Automates viewport, font preloading, safe-area meta tags, and uniform bottom navigation across all HTML pages.
- `execution/verify_frontend_health.py`: Validates that all HTML routes and JSON API endpoints return HTTP 200 OK without IPv6 hang.
