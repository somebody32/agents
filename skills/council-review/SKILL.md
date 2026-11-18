---
name: council-review
description: Run independent thermo-nuclear code-quality reviews with a four-member council, then verify and reconcile their findings. Use when the user asks for review with council, thermo-nuclear review with council, or a council re-review of a PR, branch, or working-tree change.
---

# Council Review

Run `thermo-nuclear-code-quality-review` yourself and have each council member independently run that same installed skill. It owns the review criteria, read-only boundary, approval bar, and output format; do not duplicate its checklist.

## Council

Use exactly four members in addition to your own review:

- Codex subagent: `gpt-6.2-sol` with `xhigh` reasoning.
- Codex subagent: `gpt-6.2-astra` with `xhigh` reasoning, as its own subagent and session.
- Claude/Fable: `fable` with `xhigh` effort, via the `claude` CLI.
- Claude/Opus: `opus` with `xhigh` effort, via the `claude` CLI.

Run each Codex member as its own subagent. If the subagent tool rejects a Codex model, run that member with `codex exec -m <model> -c model_reasoning_effort=xhigh -s read-only "<prompt>"` from the reviewed repository instead.

Members must not delegate. Keep their other tools and skills enabled; do not use fast mode unless requested. Report unavailable members or missing skills instead of silently substituting or claiming a complete council review.

## Workflow

1. Establish the exact repository, base, and target, including whether uncommitted changes are in scope. Write one brief for every member that describes the problem, not the solution: the user's goal and symptoms in the user's words, the scope, how to run it, and the validation evidence. Put your diagnosis and design reasoning under "Author's claims — try to disprove". Tag every constraint with its source: *user said* (the user's own words), *verified external fact* (with the evidence), *prescribed by <who>* (a handoff, ticket, or earlier agent), or *author's choice*. Only the first two bind; members may challenge the rest.
2. Ask each member to run `thermo-nuclear-code-quality-review` independently, and before line-level findings to answer: does this fix the right problem in the right layer? Where would they fix it with only the binding constraints, and does the diff work around a cause elsewhere (a hand-kept copy of another system's list, comments explaining a workaround, positional magic, timers that dodge a library)? Do not share your findings or another member's conclusions before the first pass. Perform your own review alongside theirs.
3. Verify material findings against the diff and surrounding code. For every Blocker/Major that claims a runtime failure, try to disprove it first: find who triggers it, how often, and which existing defense (validation, auth, constraint, atomic write, status check, retry/sweeper, single owner) stops it. Keep it Blocker/Major only if it clears the underlying skill's Evidence Bar; otherwise move it to Unverified risks or reject it with a one-line reason. Member agreement does not raise a finding — every member ran the same prompt. Do not add new failure chains you cannot trigger. Challenge proposed remedies too: seek the leanest coherent design that removes complexity while preserving the required behavior. A finding that the fix belongs in another layer, or that a constraint is the problem (even an approach the user or a handoff prescribed), is the user's decision: never close it as out of scope or not adopted. Report it under "Open design decision" with what each option costs. While one is open the verdict is REQUEST CHANGES, never any form of APPROVE, and it says which choice would change it.
4. Discuss important disagreements with the same members in their existing sessions. Provide evidence and counterexamples; convince or be convinced. Agreement is not proof. Stop when objections are resolved, remaining disagreement is explicit, or further discussion is unlikely to change the verdict.
5. Deliver one consolidated review in the underlying skill's format. Include the reviewed scope, material disagreements and rejected claims, and validation limitations. Own the final verdict rather than pasting three reviews.

Run the Claude members from the reviewed repository. Generate one session id per member per task with `uuidgen | tr A-Z a-z`, and paste the ids literally into every later command:

```bash
claude -p "Run thermo-nuclear-code-quality-review independently. <scope and context>. Do not delegate." --model fable --effort xhigh --session-id <fable-id> --disallowedTools "Edit,Write,NotebookEdit"
claude -p "Run thermo-nuclear-code-quality-review independently. <scope and context>. Do not delegate." --model opus --effort xhigh --session-id <opus-id> --disallowedTools "Edit,Write,NotebookEdit"
```

For follow-ups, swap `--session-id <id>` for `--resume <id>` and keep every other flag. `--disallowedTools` does not carry over to a resumed session. Keep the prompt right after `-p`: `--disallowedTools` takes several values and swallows a prompt placed after it.

Reuse each member's session and model for follow-ups. Temporary council prompts are allowed; the reviewed code stays read-only.

For re-reviews, resolve the current target again, provide the changed evidence, recheck previous findings rather than carrying them forward as facts, and ask the layer question again. Never tell members a design question is settled unless the user settled it. For multiple PRs, give a verdict per PR and check their interaction.
