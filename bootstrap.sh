#!/usr/bin/env bash
#
# Bootstrap pi configuration, extensions, and skills on a fresh machine.
#
# Idempotent: re-running only fixes what is missing or stale. Safe to invoke
# multiple times. Does NOT touch secrets — re-run `pi login <provider>` for
# each provider listed in pi-config/models.json after bootstrap.
#
# Usage:
#   ./bootstrap.sh           # apply config to ~/.pi/agent and ~/.agents/skills
#   ./bootstrap.sh --dry-run # print actions without applying

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_AGENT_DIR="${HOME}/.pi/agent"
AGENTS_SKILLS_DIR="${HOME}/.agents/skills"
SKILL_LOCK_DEST="${HOME}/.agents/.skill-lock.json"

log() { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '  [dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

require() {
  command -v "$1" >/dev/null 2>&1 || { err "missing required command: $1"; exit 1; }
}

require jq
require git

# ---------- 1. pi config files ----------
log "Installing pi config files into ${PI_AGENT_DIR}"
run mkdir -p "${PI_AGENT_DIR}"

for file in settings.json models.json; do
  src="${REPO_ROOT}/pi-config/${file}"
  dest="${PI_AGENT_DIR}/${file}"
  if [[ ! -f "$src" ]]; then
    warn "skip ${file}: not found in pi-config/"
    continue
  fi
  if [[ -f "$dest" ]] && cmp -s "$src" "$dest"; then
    log "  ${file}: up to date"
  else
    if [[ -f "$dest" ]]; then
      run cp "$dest" "${dest}.bak.$(date +%s)"
      log "  ${file}: backed up existing → ${dest}.bak.*"
    fi
    run cp "$src" "$dest"
    log "  ${file}: installed"
  fi
done

# ---------- 2. local skill symlinks ----------
log "Symlinking local skills into ${AGENTS_SKILLS_DIR}"
run mkdir -p "${AGENTS_SKILLS_DIR}"

if [[ -d "${REPO_ROOT}/skills" ]]; then
  for skill_dir in "${REPO_ROOT}/skills"/*/; do
    [[ -d "$skill_dir" ]] || continue
    name="$(basename "$skill_dir")"
    target="${AGENTS_SKILLS_DIR}/${name}"
    skill_dir_clean="${skill_dir%/}"

    if [[ -L "$target" ]]; then
      current="$(readlink "$target")"
      if [[ "$current" == "$skill_dir_clean" ]]; then
        log "  ${name}: symlink ok"
        continue
      fi
      log "  ${name}: replacing stale symlink ($current → $skill_dir_clean)"
      run rm "$target"
    elif [[ -e "$target" ]]; then
      warn "  ${name}: ${target} exists and is not a symlink — skipping"
      continue
    fi

    run ln -s "$skill_dir_clean" "$target"
    log "  ${name}: linked"
  done
else
  warn "no skills/ directory in repo, skipping symlink step"
fi

# ---------- 3. lockfile-driven remote skills ----------
LOCK_SRC="${REPO_ROOT}/pi-config/skill-lock.json"
if [[ -f "$LOCK_SRC" ]]; then
  log "Restoring remote skills from pi-config/skill-lock.json"

  # Seed ~/.agents/.skill-lock.json so `npx skills` recognises existing state.
  # The CLI will rewrite it with fresh timestamps after each add.
  if [[ ! -f "$SKILL_LOCK_DEST" ]]; then
    run cp "$LOCK_SRC" "$SKILL_LOCK_DEST"
    log "  seeded ${SKILL_LOCK_DEST}"
  fi

  # Read entries: each row is "<name>\t<source>"
  while IFS=$'\t' read -r name source; do
    [[ -n "$name" && -n "$source" ]] || continue
    target="${AGENTS_SKILLS_DIR}/${name}"
    if [[ -d "$target" && ! -L "$target" ]]; then
      log "  ${name}: already installed"
      continue
    fi
    if [[ -L "$target" ]]; then
      warn "  ${name}: conflicts with a local symlink — skipping remote install"
      continue
    fi
    log "  ${name}: installing from ${source}"
    run npx --yes skills add "$source" -g -s "$name" -y
  done < <(jq -r '.skills | to_entries[] | "\(.key)\t\(.value.source)"' "$LOCK_SRC")
else
  log "no pi-config/skill-lock.json — skipping remote skill restore"
fi

# ---------- 4. next steps ----------
cat <<EOF

$(printf '\033[1;32m✓\033[0m') Bootstrap complete.

Next steps (manual, secrets are never synced):
  1. Authenticate each provider you use:
       pi login anthropic
       pi login github-copilot
       pi login openai-codex
       pi login opencode-go
  2. Launch pi once — npm-sourced packages in settings.json hydrate on first run.
  3. If you use llama-cpp locally, ensure it is reachable at the baseUrl in
     pi-config/models.json (currently http://127.0.0.1:8080/v1).

EOF
