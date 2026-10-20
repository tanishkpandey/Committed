#!/usr/bin/env python3
"""
Committed - Verification script for Online-Only Architecture.
Deterministically inspects all codebase files, imports, guards, and server configurations.
"""

import os
import sys
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check(condition, message):
    if condition:
        print(f" [PASS] {message}")
        return True
    else:
        print(f" [FAIL] {message}")
        return False

def verify_all():
    print("=" * 60)
    print("COMMITTED: Verifying Strict Online-Only Architecture")
    print("=" * 60)
    
    all_passed = True
    
    # 1. onlineGuard.js existence and contents
    guard_js_path = os.path.join(ROOT, "public", "js", "onlineGuard.js")
    all_passed &= check(os.path.exists(guard_js_path), "public/js/onlineGuard.js exists")
    if os.path.exists(guard_js_path):
        with open(guard_js_path, "r", encoding="utf-8") as f:
            content = f.read()
        all_passed &= check("window.OnlineGuard = OnlineGuard;" in content, "OnlineGuard exposed globally")
        all_passed &= check("window.addEventListener('offline'" in content, "Listens for 'offline' network events")
        all_passed &= check("window.addEventListener('online'" in content, "Listens for 'online' network events")
        all_passed &= check("checkConnection()" in content, "Provides active ping checkConnection()")
        all_passed &= check("show(" in content and "hide()" in content, "Provides show() and hide() modal controls")
        all_passed &= check("document.body.classList.add('online-locked')" in content, "Locks body interaction when offline")

    # 2. components.css styling
    css_path = os.path.join(ROOT, "public", "css", "components.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    all_passed &= check(".online-guard-overlay" in css, "components.css styles .online-guard-overlay")
    all_passed &= check("body.online-locked" in css, "components.css styles body.online-locked blur/lock")
    all_passed &= check(".online-guard-card" in css, "components.css styles .online-guard-card")
    all_passed &= check("@keyframes onlineRadarPulse" in css, "components.css includes radar pulse animation")

    # 3. HTML files include onlineGuard.js and anti-cache headers
    html_files = [
        "index.html",
        "habits.html",
        "progress.html",
        "analytics.html",
        "habit-detail.html",
        "settings.html"
    ]
    for hf in html_files:
        hp = os.path.join(ROOT, "public", hf)
        all_passed &= check(os.path.exists(hp), f"public/{hf} exists")
        with open(hp, "r", encoding="utf-8") as f:
            html = f.read()
        all_passed &= check("js/onlineGuard.js" in html, f"public/{hf} imports js/onlineGuard.js")
        all_passed &= check("no-cache, no-store, must-revalidate" in html, f"public/{hf} has anti-cache headers")

    # 4. API Client enforcement
    api_js_path = os.path.join(ROOT, "public", "js", "api.js")
    with open(api_js_path, "r", encoding="utf-8") as f:
        api_js = f.read()
    all_passed &= check("OnlineGuard" in api_js, "api.js integrates with OnlineGuard")
    all_passed &= check("!navigator.onLine" in api_js, "api.js checks navigator.onLine before requests")
    all_passed &= check("OnlineGuard.handleNetworkFailure" in api_js, "api.js notifies OnlineGuard on network failures")

    # 5. Client action guards
    files_to_check = {
        "today.js": ["OnlineGuard", "toggleHabitLog"],
        "app.js": ["OnlineGuard", "handleTileClick"],
        "habitDetail.js": ["OnlineGuard", "toggleDetailDate", "saveHabitEdits"],
        "habitModal.js": ["OnlineGuard", "saveHabitForm", "deleteHabitAction"],
        "settings.js": ["OnlineGuard", "saveCategoryForm", "handleDeleteCategory"]
    }
    for js_file, tokens in files_to_check.items():
        jp = os.path.join(ROOT, "public", "js", js_file)
        with open(jp, "r", encoding="utf-8") as f:
            code = f.read()
        for tok in tokens:
            all_passed &= check(tok in code, f"public/js/{js_file} contains '{tok}'")

    # 6. server/server.js anti-cache headers and health check
    server_js_path = os.path.join(ROOT, "server", "server.js")
    with open(server_js_path, "r", encoding="utf-8") as f:
        server_js = f.read()
    all_passed &= check("/health" in server_js and "/api/health" in server_js, "server.js serves /health and /api/health")
    all_passed &= check("online-only" in server_js, "server.js health report declares mode: online-only")
    all_passed &= check("no-store, no-cache, must-revalidate" in server_js, "server.js sets strict anti-cache headers")

    # 7. README.md documentation
    readme_path = os.path.join(ROOT, "README.md")
    with open(readme_path, "r", encoding="utf-8") as f:
        readme = f.read()
    all_passed &= check("Online-Only" in readme, "README.md documents Online-Only architecture")
    all_passed &= check("store.json" not in readme, "README.md contains zero references to store.json")

    print("=" * 60)
    if all_passed:
        print("RESULT: ALL ONLINE-ONLY VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 60)
        return 0
    else:
        print("RESULT: SOME CHECKS FAILED.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(verify_all())
