# agents

Personal pi setup: extensions, skills, and config. Replicates the same environment across machines.

## Layout

```
agents/
├── pi-config/
│   ├── settings.json       # → ~/.pi/agent/settings.json
│   ├── models.json         # → ~/.pi/agent/models.json (no secrets in this file)
│   └── skill-lock.json     # manifest of remote skills installed via `npx skills`
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

1. Copies `pi-config/settings.json` and `pi-config/models.json` into `~/.pi/agent/` (backs up any existing files first).
2. Symlinks every `skills/<name>/` into `~/.agents/skills/<name>`.
3. Reads `pi-config/skill-lock.json` and runs `npx skills add` for each remote skill.
4. On first pi launch, npm-sourced packages declared in `settings.json` auto-install.

Run `./bootstrap.sh --dry-run` to preview actions without applying them.

## What is NOT synced

| Path | Why |
|------|-----|
| `~/.pi/agent/auth.json` | OAuth tokens — re-run `pi login` per provider |
| `~/.pi/agent/{sessions,logs,cache,memory,bin,git,run-history.jsonl}` | runtime state |
| `~/.agents/skills/.skill-lock.json` | regenerated from `pi-config/skill-lock.json` |

## Updating the committed config from a machine

After installing or removing a package via `pi install` / `pi remove` or editing settings via `/settings`, copy the changes back:

```bash
cp ~/.pi/agent/settings.json     pi-config/settings.json
cp ~/.pi/agent/models.json       pi-config/models.json
cp ~/.agents/.skill-lock.json    pi-config/skill-lock.json
git diff pi-config/               # review
git add pi-config/ && git commit  # ship to other machines
```

Before committing `models.json`, verify it does not contain real `apiKey` values — the local llama-cpp entry uses `"apiKey": "none"`, which is fine to commit.
