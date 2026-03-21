---
description: Sync scaffold files in this project against a source repo, creating or updating files with details adapted to this project
argument-hint: source repo URL, e.g. https://github.com/rapideditor/temaki
---

You are doing a scaffold sync. For each file in the manifest below, fetch the source version, compare it to the local version, and **create or update the local file** — substituting any source-specific details with this project's equivalent. The goal is to carry the source's structure and generic content forward while keeping this project's identity intact.

## Setup

The source repo is: **${input:source_repo}**

Before doing anything else:
1. Read this project's `package.json` (or equivalent manifest) to learn: project name, description, repo URL, license, author(s), and language/runtime.
2. Read the source repo's `package.json` too — you'll need to know which details to substitute.
3. Convert the source repo URL to a raw content base URL:
   - `https://github.com/owner/repo` → `https://raw.githubusercontent.com/owner/repo/main`

---

## Scaffold file manifest

Process each file below. For every file: fetch the source, read the local version (if it exists), then apply the specific instructions listed.

- `.github/prompts/commit.prompt.md` — generic workflow; substitute any repo-specific examples or URLs
- `.github/prompts/suggest.prompt.md` — generic; substitute any repo-specific examples or file paths
- `.github/prompts/reflect.prompt.md` — generic; substitute any repo-specific layer references (file names, tools, etc.)
- `.github/prompts/scaffold.prompt.md` — generic; substitute the example source repo URL in the argument-hint
- `AGENTS.md` — the general guidelines section is portable; substitute project-specific references (scratchpad notes, file paths, tool names) with this project's equivalents; preserve any local sections that have no counterpart in the source
- `.github/prompts/release.prompt.md` — workflow steps are generic; substitute repo URL, changelog format, and any tooling references
- `README.md` — preserve this project's actual description, icon list, and any unique content; adopt structural sections (badge layout, contributing footer, license block) from the source if they are absent locally; do not overwrite meaningful local content with source content
- `CONTRIBUTING.md` — substitute this project's tooling and runtime wherever the source references specific tools (e.g. Bun, npm, make); keep the source's structural sections
- `RELEASE.md` — substitute this project's repo URL, branch names, and tooling references
- `LICENSE.md` — if the local license type matches `package.json`, treat as in sync and skip; if the type differs from the source, flag it and ask before changing
- `tsconfig.json` — apply structural changes and new compiler options from the source; flag any option that differs in value and ask before overwriting, since local values may be intentional
- `.gitattributes` — apply source content wholesale if missing; if present, add any entries from the source that are absent locally without removing local-only entries
- `.gitignore` — merge: add entries from source that are absent locally; do not remove local-only entries
- `bunfig.toml` — skip entirely if this project does not use Bun; otherwise apply source content with any registry or test configuration substituted for this project's equivalents

---

## Steps

For each file in the manifest:

1. Fetch the raw source content from `{raw_base_url}/{file_path}` (skip gracefully if the source repo doesn't have it)
2. Check whether the file exists locally
3. Identify all source-specific values: repo name, org, URLs, package names, author names, version numbers, tool names — anything that belongs to the source project rather than the template structure
4. Replace each source-specific value with the corresponding value from this project (from `package.json` or existing local files)
5. Create or update the local file with the adapted content

---

## How to report

After processing all files, produce a summary table:

| File | Status | Notes |
|------|--------|-------|
| `.github/prompts/commit.prompt.md` | ✅ In sync / 🔄 Updated / ✨ Created / ⏭️ Skipped | … |
| … | … | … |

For each **🔄 Updated** or **✨ Created** file: briefly describe what was substituted or what structural changes were adopted.

For **⏭️ Skipped** files: one line explaining why (e.g. "source repo doesn't have this file" or "Bun not used in this project").

For files that were **✅ In sync**: one line is enough.

