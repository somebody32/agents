---
name: handoff
description: Use when the user wants to continue in a fresh session, hand work to another agent, preserve current context near context limits, or create a compact continuation brief for later. Use when they say handoff, next session, fresh agent, continue tomorrow, context limit, or pass this to another agent.
---

# Handoff

## Overview

**Core principle:** a handoff is a compact bridge to a fresh context window, not a new source of truth.

Write only what the next agent needs to continue. Reference durable artifacts instead of duplicating them.

## Where to Write

Save the handoff in the OS temp directory, not the repo/workspace.

Use a clear filename:

```text
/tmp/handoff-<topic>-<timestamp>.md
```

On macOS/Linux use `$TMPDIR` if set, otherwise `/tmp`. Do not create `docs/.../handoff.md` unless the user explicitly asks for a durable repo artifact.

## What to Include

Required sections:

```md
# Handoff: <topic>

## Focus for next session
<what the next agent should accomplish>

## Current status
<what is done, what is in progress, what is not done>

## Durable artifacts to read
- <path or URL>: <why it matters>

## Decisions already made
- <decision + consequence>

## Next steps
1. <concrete action>
2. <concrete action>

## Open questions / risks
- <question or risk>

## Suggested skills
- <skill-name>: <why>

## Do not duplicate / do not touch
- <constraints, files, or decisions to avoid changing>
```

If the user gave a focus argument, tailor the handoff to that focus. Do not summarize the whole session if the next session only needs slice 2.

## What to Avoid

- Do not paste full PRDs, ADRs, decision maps, prototypes, issues, diffs, or long logs. Link them.
- Do not write a transcript.
- Do not preserve speculation as fact.
- Do not include secrets, API keys, tokens, passwords, or private personal data.
- Do not copy large code blocks unless the snippet is the decision itself and no artifact already stores it.
- Do not turn handoff into durable project documentation.

If a secret appeared in the conversation, redact it and add a security note: “A live-looking secret was present in prior context; do not copy it. Rotate/revoke if real.”

## Suggested Skills

Recommend skills the next agent should load, based on the task:

| Next task | Suggested skills |
|---|---|
| continue design/planning | `shaping` |
| implement code | `tdd`, `surgical-edits`, relevant domain skill |
| debug a failure | `systematic-debugging` |
| decide code placement / mocking | `placing-code-in-layers` |
| edit skills | `writing-skills` |
| browser/UI work | `frontend-design` or browser automation skill if available |

Do not over-list. 1–4 suggested skills is enough.

## Completion Criteria

Before finishing:

- The handoff file exists in temp dir.
- It references existing artifacts instead of duplicating them.
- It is focused on the next session’s goal.
- It contains suggested skills.
- Secrets and sensitive data are redacted.
- The final response gives the absolute path and one sentence on how to resume.

Example final response:

```text
Wrote handoff: /tmp/handoff-import-wizard-slice-2-20260622-1530.md
Resume with: pi @/tmp/handoff-import-wizard-slice-2-20260622-1530.md "Continue from this handoff"
```
