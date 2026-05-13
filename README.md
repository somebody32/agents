# agents

Personal pi setup: extensions, skills, and config. Replicates the same environment across machines.

## Layout

```
agents/
├── pi-config/
│   ├── settings.json       # → ~/.pi/agent/settings.json
│   ├── models.json         # → ~/.pi/agent/models.json (no secrets in this file)
│   ├── skill-lock.json     # manifest of remote skills installed via `npx skills`
│   └── extensions/         # (optional) per-extension JSON configs, copied to ~/.pi/
├── pi-extensions/          # local extensions, referenced by pi-config/settings.json
│   ├── skill-recall/
│   └── system-prompt-tweak/
├── skills/                 # local skills, symlinked into ~/.agents/skills/
└── bootstrap.sh            # idempotent installer
```

## Setup on a new machine

```bash
git clone https://github.com/somebody32/agents.git ~/Developer/agents
cd ~/Developer/agents
./bootstrap.sh
# then authenticate each provider:
pi login anthropic
pi login github-copilot   # etc.
```

The script:

1. **Symlinks** `~/.pi/agent/settings.json` and `~/.pi/agent/models.json` to the files in `pi-config/` (backs up any pre-existing real files first). Pi writes through the symlink, so any future `/settings` edit, `pi install`, or `lastChangelogVersion` bump shows up immediately as a `git diff` — no copy-back step needed.
2. Merges any `pi-config/extensions/*.json` into `~/.pi/<name>.json` via `jq` so locally-held secrets (e.g. `exaApiKey`) survive re-runs.
3. Symlinks every `skills/<name>/` into `~/.agents/skills/<name>`.
4. Reads `pi-config/skill-lock.json` and runs `npx skills add` for each remote skill.
5. On first pi launch, npm-sourced packages declared in `settings.json` auto-install.

Run `./bootstrap.sh --dry-run` to preview actions without applying them.

## Extension configs

Some extensions store their own settings outside `~/.pi/agent/`, directly under `~/.pi/<name>.json`. Currently relevant:

| File | Owner | Contains | Sync strategy |
|------|-------|----------|---------------|
| `~/.pi/web-search.json` | pi-web-access | `exaApiKey` (secret), `geminiApiKey` (secret), plus optional prefs: `workflow`, `searchProvider`, `summaryModel`, `shortcuts`, `autoFilter`, `youtube`, `githubClone`, `curatorTimeoutSeconds`, `allowBrowserCookies` | Commit prefs only; bootstrap merges them into the existing file so the local secrets survive. Secrets are set per-machine (see below). |

**Adding portable prefs:** put a sanitized JSON file into `pi-config/extensions/`, e.g.

```json
// pi-config/extensions/web-search.json
{
  "workflow": "summary-review",
  "shortcuts": { "curate": "ctrl+shift+s" }
}
```

Bootstrap will `jq` -merge it into `~/.pi/web-search.json` on each machine, preserving any `exaApiKey` already present.

**Adding secrets per machine** (one-time, after bootstrap):

```bash
# Either drop them into the JSON file:
jq '. + {exaApiKey: "<key>"}' ~/.pi/web-search.json | sponge ~/.pi/web-search.json
# Or export env vars in your shell rc (pi-web-access reads both):
export EXA_API_KEY=...
export GEMINI_API_KEY=...
```

## What is NOT synced

| Path | Why |
|------|-----|
| `~/.pi/agent/auth.json` | OAuth tokens — re-run `pi login` per provider |
| `~/.pi/agent/{sessions,logs,cache,memory,bin,git,run-history.jsonl}` | runtime state |
| `~/.pi/paperclips/` | pi session recordings for runs launched from Paperclip workspaces |
| `~/.pi/exa-usage.json` | pi-web-access monthly request counter |
| `~/.pi/web-search.json` (the file itself) | contains secrets; only its non-secret prefs are templated via `pi-config/extensions/` |
| `~/.agents/skills/.skill-lock.json` | regenerated from `pi-config/skill-lock.json` |

## Updating the committed config from a machine

`settings.json` and `models.json` are symlinked, so any change made via pi (`pi install`, `/settings`, etc.) is **already** in the repo — just review and commit:

```bash
cd ~/Developer/agents
git diff pi-config/
git add pi-config/ && git commit
```

`skill-lock.json` and extension configs are not symlinked, so for them:

```bash
cp ~/.agents/.skill-lock.json    pi-config/skill-lock.json
# Extension configs: hand-pick non-secret keys
jq 'del(.exaApiKey, .geminiApiKey)' ~/.pi/web-search.json > pi-config/extensions/web-search.json
git add pi-config/ && git diff --cached
```

Before committing anything: scan for keys. `models.json`'s `llama-cpp` block uses `"apiKey": "none"` (safe). Any other `apiKey` / `token` field is a red flag.
