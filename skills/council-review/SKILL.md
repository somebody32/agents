---
name: council-review
description: Run independent thermo-nuclear code-quality reviews with a three-member council, then verify and reconcile their findings. Use when the user asks for review with council, thermo-nuclear review with council, or a council re-review of a PR, branch, or working-tree change.
---

# Council Review

Run `thermo-nuclear-code-quality-review` yourself and have each council member independently run that same installed skill. It owns the review criteria, read-only boundary, approval bar, and output format; do not duplicate its checklist.

## Council

Use exactly three members in addition to your own review:

- Codex subagent: `gpt-6.1-sol` with `xhigh` reasoning.
- pi/Fable: `anthropic/claude-fable-5-1` with `high` reasoning.
- pi/Opus: `anthropic/claude-opus-5-5` with `xhigh` reasoning.

Members must not delegate. Keep pi tools and skills enabled; do not use fast mode unless requested. Report unavailable members or missing skills instead of silently substituting or claiming a complete council review.

## Workflow

1. Establish the exact repository, base, and target, including whether uncommitted changes are in scope. Give every member the same scope, intended behavior, constraints, and available validation evidence.
2. Ask each member to run `thermo-nuclear-code-quality-review` independently. Do not share your findings or another member's conclusions before the first pass. Perform your own review alongside theirs.
3. Verify material findings against the diff and surrounding code. For every Blocker/Major that claims a runtime failure, try to disprove it first: find who triggers it, how often, and which existing defense (validation, auth, constraint, atomic write, status check, retry/sweeper, single owner) stops it. Keep it Blocker/Major only if it clears the underlying skill's Evidence Bar; otherwise move it to Unverified risks or reject it with a one-line reason. Member agreement does not raise a finding — every member ran the same prompt. Do not add new failure chains you cannot trigger. Challenge proposed remedies too: seek the leanest coherent design that removes complexity while preserving the required behavior.
4. Discuss important disagreements with the same members in their existing sessions. Provide evidence and counterexamples; convince or be convinced. Agreement is not proof. Stop when objections are resolved, remaining disagreement is explicit, or further discussion is unlikely to change the verdict.
5. Deliver one consolidated review in the underlying skill's format. Include the reviewed scope, material disagreements and rejected claims, and validation limitations. Own the final verdict rather than pasting three reviews.

Run pi from the reviewed repository with separate, task-specific sessions:

```bash
pi -p --approve --session /tmp/council-review-<task>-fable.jsonl --model anthropic/claude-fable-5-1 --thinking high "Run thermo-nuclear-code-quality-review independently. <scope and context>. Do not delegate."
pi -p --approve --session /tmp/council-review-<task>-opus.jsonl --model anthropic/claude-opus-5-5 --thinking xhigh "Run thermo-nuclear-code-quality-review independently. <scope and context>. Do not delegate."
```

Reuse each member's session and model for follow-ups. Temporary council prompts and session files are allowed; the reviewed code stays read-only.

For re-reviews, resolve the current target again, provide the changed evidence, and recheck previous findings rather than carrying them forward as facts. For multiple PRs, give a verdict per PR and check their interaction.
