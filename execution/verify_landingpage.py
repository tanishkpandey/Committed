#!/usr/bin/env python3
"""
Committed - Verification script for /landingpage.
Checks route response, headers, content, button targets, and absence of /api/* calls.
"""

import os
import sys
import urllib.request
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
    print("COMMITTED: Verifying /landingpage Implementation")
    print("=" * 60)
    
    all_passed = True
    
    # 1. Check local files existence
    landing_html_path = os.path.join(ROOT, "public", "landingpage.html")
    landing_css_path = os.path.join(ROOT, "public", "css", "landingpage.css")
    landing_js_path = os.path.join(ROOT, "public", "js", "landingpage.js")
    
    all_passed &= check(os.path.exists(landing_html_path), "public/landingpage.html exists")
    all_passed &= check(os.path.exists(landing_css_path), "public/css/landingpage.css exists")
    all_passed &= check(os.path.exists(landing_js_path), "public/js/landingpage.js exists")

    # 2. Inspect landingpage.html content
    with open(landing_html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Verify no /api/ calls in HTML or JS
    all_passed &= check("/api/" not in html, "landingpage.html makes zero /api/* calls")
    with open(landing_js_path, "r", encoding="utf-8") as f:
        js_code = f.read()
    all_passed &= check("/api/" not in js_code and "fetch(" not in js_code, "landingpage.js makes zero /api/* calls")

    # Verify all buttons/links say "Open app" and link to "/"
    # Find all <a> or <button> with class btn-open-app or similar
    button_matches = re.findall(r'<a[^>]*class="[^"]*btn-open-app[^"]*"[^>]*>(.*?)</a>', html)
    all_passed &= check(len(button_matches) >= 3, f"Found {len(button_matches)} 'Open app' action buttons")
    for text in button_matches:
        cleaned_text = re.sub(r'<[^>]+>', '', text).strip()
        all_passed &= check(cleaned_text == "Open app", f"Button text is exactly 'Open app' (found: '{cleaned_text}')")
    
    # Check that all hrefs on these buttons point to "/"
    href_matches = re.findall(r'<a[^>]*class="[^"]*btn-open-app[^"]*"[^>]*href="([^"]*)"', html)
    for href in href_matches:
        all_passed &= check(href == "/", f"Button href points to '/' (found: '{href}')")

    # 3. Verify sections present
    all_passed &= check("Build habits that stick, one day at a time." in html, "Hero contains plain headline about building habits that stick")
    all_passed &= check("lpHeroHeatmapSvg" in html, "Hero contains contribution heatmap picture container")
    all_passed &= check("The problem" in html and "Why do good habits fade?" in html, "Contains 'The problem' section")
    all_passed &= check("Out of sight" in html and "All or nothing" in html, "Problem section contains 3 points")
    all_passed &= check("How it works" in html, "Contains 'How it works' section")
    all_passed &= check("Add your habits" in html and "Check in on Today" in html and "Watch your streak" in html, "How it works contains the 3 steps")
    all_passed &= check("Screenshots" in html, "Contains Screenshots section")
    all_passed &= check("Today Screen" in html and "Habits Screen" in html and "Progress Screen" in html, "Screenshots section contains Today, Habits, and Progress")
    all_passed &= check("lp-screen-placeholder" in html, "Screenshots use grey placeholder boxes")
    all_passed &= check("Badges & Tiers" in html or "Badges" in html, "Contains Badges section")
    all_passed &= check("Common" in html and "Rare" in html and "Epic" in html and "Legendary" in html, "Badges section contains the 4 rarity tiers")
    all_passed &= check("Ready to start your streak?" in html, "Contains Final call section")
    all_passed &= check("lp-footer" in html, "Contains plain footer")

    # 4. Test live HTTP responses from local server
    base_url = "http://127.0.0.1:3000"
    
    # Check /landingpage
    try:
        req = urllib.request.Request(f"{base_url}/landingpage")
        with urllib.request.urlopen(req, timeout=4) as res:
            all_passed &= check(res.status == 200, "/landingpage returns HTTP 200")
            cache_ctrl = res.headers.get("Cache-Control", "")
            all_passed &= check("no-store" in cache_ctrl or "no-cache" in cache_ctrl, f"/landingpage has anti-cache headers ({cache_ctrl})")
            body = res.read().decode("utf-8")
            all_passed &= check("Committed" in body and "Open app" in body, "/landingpage renders page HTML successfully")
    except Exception as e:
        all_passed &= check(False, f"/landingpage request failed: {e}")

    # Verify other existing routes behave exactly as before
    existing_routes = ["/", "/today", "/habits", "/progress", "/settings", "/health"]
    for route in existing_routes:
        try:
            req = urllib.request.Request(f"{base_url}{route}")
            with urllib.request.urlopen(req, timeout=4) as res:
                all_passed &= check(res.status == 200, f"Existing route {route} returns HTTP 200")
        except Exception as e:
            all_passed &= check(False, f"Existing route {route} failed: {e}")

    print("=" * 60)
    if all_passed:
        print("RESULT: ALL /landingpage VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 60)
        return 0
    else:
        print("RESULT: SOME CHECKS FAILED.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(verify_all())
