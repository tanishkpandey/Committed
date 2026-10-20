# Directive: Install Agent Skill

## Goal
Install an Agent Skill directory from a GitHub repository into the project-scoped skill location (`.agents/skills/<skill-name>`), preserving all subdirectories, scripts, references, assets, and relative links, and verifying skill integrity.

## Inputs
- `repo`: GitHub repository in `owner/repo` format (e.g., `anthropics/skills`).
- `revision`: Git branch or commit hash (e.g., `main` or specific SHA).
- `skill_path`: Relative path inside the repository to the skill directory (e.g., `skills/skill-creator`).
- `dest_dir`: Target directory path on the local filesystem (e.g., `.agents/skills/skill-creator`).

## Execution Tool
- `execution/install_github_skill.py`

## Outputs
- Complete skill directory installed at `dest_dir`.
- Verification of `SKILL.md` and companion files.
- Report of installed files, revision, and prerequisites.

## Edge Cases & Error Handling
- Windows console encoding: Ensure stdout avoids non-ASCII characters (e.g. checkmarks) when running on Windows (cp1252 codepage).
- Rate limiting on GitHub API: Use raw downloads with clear error reporting.
- Path traversal / nested assets: Ensure recursive directory structure is preserved.
- Existing files: Check before overwriting.
