import re
import os

HTML_FILES = [
    {
        "file": "public/index.html",
        "active": "home"
    },
    {
        "file": "public/progress.html",
        "active": "progress"
    },
    {
        "file": "public/manage-habits.html",
        "active": "manage"
    },
    {
        "file": "public/analytics.html",
        "active": "analytics"
    },
    {
        "file": "public/settings.html",
        "active": "settings"
    },
    {
        "file": "public/habit-detail.html",
        "active": "detail"
    }
]

def make_bottom_nav(active):
    items = [
        {"href": "/", "active": active == "home" or active == "detail", "icon": "layout-grid", "label": "Habits"},
        {"href": "/progress.html", "active": active == "progress", "icon": "award", "label": "Progress"},
        {"href": "/manage-habits.html", "active": active == "manage", "icon": "sliders", "label": "Studio"},
        {"href": "/analytics.html", "active": active == "analytics", "icon": "bar-chart-2", "label": "Insights"},
        {"href": "/settings.html", "active": active == "settings", "icon": "settings", "label": "Settings"},
    ]
    lines = ['  <nav class="bottom-nav">']
    for it in items:
        cls = 'nav-item active' if it['active'] else 'nav-item'
        lines.append(f'    <a href="{it["href"]}" class="{cls}">')
        lines.append(f'      <i data-lucide="{it["icon"]}"></i>')
        lines.append(f'      <span>{it["label"]}</span>')
        lines.append('    </a>')
    lines.append('  </nav>')
    return '\n'.join(lines)

def update_file(info):
    filepath = info["file"]
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Viewport & Mobile meta tags
    viewport_pattern = r'<meta name="viewport"[^>]*>'
    new_viewport = '''<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0a0c10" id="themeColorMeta">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">'''
    
    content = re.sub(viewport_pattern, new_viewport, content, count=1)

    # 2. Bottom Nav standardization
    # Match <nav class="bottom-nav">.*?</nav> with DOTALL
    nav_pattern = r'<nav class="bottom-nav">.*?</nav>'
    new_nav = make_bottom_nav(info["active"])
    content = re.sub(nav_pattern, new_nav, content, flags=re.DOTALL)

    # 3. Add sheet-drag-handle into modal-box if not present
    # Look for <div class="modal-box"> or <div class="modal-box ...">
    def add_handle(match):
        box_tag = match.group(0)
        return box_tag + '\n      <div class="sheet-drag-handle"></div>'

    # Only replace if sheet-drag-handle is not already in the modal-box
    if '<div class="sheet-drag-handle"></div>' not in content:
        content = re.sub(r'<div class="modal-box[^"]*">', add_handle, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

for item in HTML_FILES:
    update_file(item)

print("ALL PAGES STANDARDIZED SUCCESSFULLY!")
