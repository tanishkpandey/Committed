"""
Deterministic script to download and install an agent skill from a GitHub repository.
Preserves full directory structure, companion scripts, assets, references, and SKILL.md.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Antigravity-Skill-Installer"}
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))

def download_file(url, target_path):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Antigravity-Skill-Installer"}
    )
    with urllib.request.urlopen(req) as response:
        content = response.read()
    with open(target_path, "wb") as f:
        f.write(content)

def main():
    parser = argparse.ArgumentParser(description="Install an Agent Skill from GitHub")
    parser.add_argument("--repo", required=True, help="GitHub repository (owner/repo)")
    parser.add_argument("--revision", default="main", help="Branch or commit SHA")
    parser.add_argument("--skill-path", required=True, help="Path to skill in repo (e.g. skills/skill-creator)")
    parser.add_argument("--dest", required=True, help="Destination directory")
    args = parser.parse_args()

    repo = args.repo.strip("/")
    revision = args.revision
    skill_path = args.skill_path.strip("/")
    dest = os.path.abspath(args.dest)

    print(f"Fetching repository tree for {repo} at {revision}...")
    tree_url = f"https://api.github.com/repos/{repo}/git/trees/{revision}?recursive=1"
    try:
        tree_data = fetch_json(tree_url)
    except urllib.error.URLError as e:
        print(f"Error fetching tree: {e}", file=sys.stderr)
        sys.exit(1)

    items = tree_data.get("tree", [])
    skill_prefix = skill_path + "/"
    files_to_download = [
        item for item in items 
        if item["type"] == "blob" and (item["path"] == skill_path or item["path"].startswith(skill_prefix))
    ]

    if not files_to_download:
        print(f"No files found under '{skill_path}' in {repo}@{revision}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(files_to_download)} files to download for {skill_path}.")
    os.makedirs(dest, exist_ok=True)

    downloaded = []
    for item in files_to_download:
        rel_path = item["path"][len(skill_prefix):] if item["path"].startswith(skill_prefix) else os.path.basename(item["path"])
        target_file = os.path.join(dest, rel_path)
        raw_url = f"https://raw.githubusercontent.com/{repo}/{revision}/{item['path']}"
        print(f"Downloading: {rel_path} -> {target_file}")
        download_file(raw_url, target_file)
        downloaded.append(rel_path)

    skill_md = os.path.join(dest, "SKILL.md")
    if not os.path.exists(skill_md):
        print("WARNING: SKILL.md was not found in the downloaded files!", file=sys.stderr)
        sys.exit(1)

    print("\nVerification:")
    print(f"[OK] SKILL.md present ({os.path.getsize(skill_md)} bytes)")
    print(f"[OK] Installed {len(downloaded)} files successfully to {dest}")

if __name__ == "__main__":
    main()
