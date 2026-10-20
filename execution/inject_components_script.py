import os
import re

FILES = [
    "public/index.html",
    "public/progress.html",
    "public/manage-habits.html",
    "public/analytics.html",
    "public/settings.html",
    "public/habit-detail.html"
]

TAG = '  <script src="js/components.js?v=1788630000"></script>'

for fpath in FILES:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    if "js/components.js" not in content:
        # Insert after utils.js
        pattern = r'(<script src="js/utils\.js[^"]*"></script>)'
        replacement = r'\1\n' + TAG
        new_content = re.sub(pattern, replacement, content, count=1)
        if new_content != content:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"[OK] Injected components.js into {fpath}")
        else:
            print(f"[WARN] utils.js pattern not found in {fpath}")
    else:
        print(f"[SKIP] components.js already in {fpath}")

print("Done injecting components.js script tag.")
