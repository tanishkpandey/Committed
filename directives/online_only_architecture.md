# SOP: Online-Only Architecture & Real-Time Cloud Guard

## Objective
Enforce strict online-only operation for Committed. Prohibit offline usage, prevent un-synced client mutations, eliminate offline fallbacks or stale local storage modes, and present an intelligent real-time connectivity guard overlay whenever internet access is unavailable.

## Background & Rationale
Committed utilizes Supabase PostgreSQL for behavioral intelligence, XP progression, and multi-year streaks. Allowing offline mutations causes streak race conditions, out-of-order XP calculations, and desynchronization across devices. Committed operates exclusively in real-time online mode.

## 3-Layer Architecture Implementation

### Layer 1: Directive (This Document)
- Define requirements for network status detection, API client guards, interactive action locking, non-dismissible offline blocker UI, and reconnection auto-synchronization.

### Layer 2: Orchestration (Agent Flow)
1. Write and maintain `public/js/onlineGuard.js` which manages network connectivity detection, modal overlay lifecycle, active `/health` ping reachability testing, and reactive auto-refresh upon reconnection.
2. Integrate `OnlineGuard` into `public/js/api.js` to preemptively reject requests if offline and catch unexpected connection drops.
3. Guard user mutations in `today.js`, `app.js`, `habitDetail.js`, `habitModal.js`, and `settings.js`.
4. Add high-end Linear/Apple-grade styling for `.online-guard-overlay` in `public/css/components.css`.
5. Ensure script tag `<script src="js/onlineGuard.js"></script>` is loaded on every page before API/app scripts.
6. Configure `server/server.js` with no-cache headers for HTML files and `/api/health` endpoint.
7. Update `README.md` documentation to reflect the strict online-only design.
8. Validate the implementation via `execution/verify_online_only.py`.

### Layer 3: Execution Scripts
- `execution/verify_online_only.py`: Deterministic test suite verifying all code files, imports, guards, and server configurations.
