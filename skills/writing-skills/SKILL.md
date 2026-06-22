---
name: writing-skills
description: Use when creating, editing, pruning, splitting, merging, or testing agent skills. Use when deciding skill frontmatter, model-vs-user invocation, description triggers, supporting files, pressure scenarios, or whether a skill should exist.
---

# Writing Skills

## Overview

**Core principle:** writing skills is TDD for process documentation. A skill should make agent behavior predictable: the same process every run, even when outputs differ.

If you did not watch an agent fail without the skill, you do not know what the skill needs to teach. If you edit a skill without re-testing the behavior, you are guessing.

## The Iron Law

```
NO SKILL CREATION OR EDIT WITHOUT A FAILING TEST FIRST.
```

This applies to new skills, edits, rewrites, pruning, splitting, merging, and “just documentation cleanup”.

No exceptions:
- Do not add “obvious” guidance without a pressure scenario.
- Do not keep untested text as “reference”.
- Do not batch multiple skills before verifying each one.
- If you wrote the skill before RED, delete it and start over.

## What a Skill Is

A skill is reusable operational guidance: a technique, pattern, workflow, or reference that future agents should apply across tasks.

Skills are not:
- one-off session notes;
- project conventions better placed in `AGENTS.md` / `CLAUDE.md`;
- mechanical checks better enforced by scripts, linters, hooks, or validation;
- essays explaining why something matters without changing agent behavior.

## RED-GREEN-REFACTOR

### RED — prove the default failure

Write pressure scenarios before editing. Run them without the skill, or with the current skill if editing. Capture exact bad behavior and rationalizations.

Good pressure scenarios combine forces:
- time pressure: “quickly”, “before EOD”, “hotfix”;
- authority pressure: “the user says just do it”;
- sunk cost: “you already wrote code/docs”;
- ambiguity: unclear triggers, vague success criteria;
- tempting shortcut: inspection, summary, mock, broad cleanup, unsupported field.

RED is valid only if the agent actually fails. “This guidance would be nice” is not RED.

### GREEN — minimal skill text

Write the smallest text that addresses the observed failure. Put the important instruction where the agent will see it before the failure point.

Then run the same scenarios with the skill loaded. The agent must now behave correctly under the same pressure.

### REFACTOR — close loopholes and prune

If the agent finds a new rationalization, add the counter and re-test. If a line did not change behavior in tests, delete it. Skills rot by accumulation.

## Testing Different Skill Types

| Skill type | Test with | Success means |
|---|---|---|
| Discipline / rule | Pressure scenarios with temptation to violate | Agent follows the rule under pressure |
| Technique | Application scenarios and variants | Agent applies the technique correctly |
| Pattern / mental model | Recognition + counter-examples | Agent knows when to apply and when not to |
| Reference | Retrieval + application | Agent finds and uses the right fact/API |

Testing can be done with a subagent, a fresh model session, or a forced system-prompt run. Record the prompt, model, and output. Do not rely on your own reading of the skill.

## Frontmatter and Invocation

Required fields:

```yaml
---
name: skill-name
description: Use when [specific trigger conditions]
---
```

Rules:
- `name`: lowercase letters, numbers, hyphens; max 64 chars.
- `description`: max 1024 chars.
- Optional Pi-supported fields include `disable-model-invocation`, `license`, `compatibility`, `metadata`, and `allowed-tools`.

### Model-invoked skills

Default mode. The model sees the description and may load the skill autonomously. This spends **context load** every session.

Use when:
- the agent must discover the skill on its own;
- another skill must be able to reach it;
- the trigger is common enough to justify always-visible metadata.

Description rules:
- describe **when to use**, not the workflow;
- start with “Use when…”;
- include concrete triggers, symptoms, and synonyms;
- do not summarize steps — agents may follow the description and skip the body.

Bad:

```yaml
description: Use for TDD — write a failing test, implement minimal code, refactor, run review.
```

Good:

```yaml
description: Use when implementing features, fixing bugs, refactoring, or changing production code before writing implementation.
```

### User-invoked skills

Manual-only. Hide from model discovery:

```yaml
---
name: release-checklist
description: Manual release checklist
disable-model-invocation: true
---
```

Use when the human will explicitly run `/skill:name`. Do not write rich trigger descriptions for manual-only skills. If there are many manual-only skills and the user forgets names, create one model-invoked router skill instead of making everything model-invoked.

## Skill Granularity

Every split spends a cost:
- more model-invoked skills → more context load and false triggers;
- more user-invoked skills → more human cognitive load.

Split only for one of two reasons:

1. **Invocation split:** a branch has its own distinct trigger and should be discoverable on its own.
2. **Sequence split:** later steps tempt the agent to prematurely complete earlier steps; hiding them improves compliance.

Do not split just because a file is long. First prune sediment and duplication.

## Information Hierarchy

Put content where the agent needs it:

1. **Inline in `SKILL.md`:** non-negotiable rules, common-path steps, decision points needed before choosing a path, failure modes proven by tests.
2. **Supporting file:** branch-specific heavy reference, API docs, long examples, or reusable tools needed only after a clear gate.
3. **Delete:** rationale, history, duplicate examples, obvious advice, stale notes, no-op prose.

A weak link is not enough:

```md
Bad: See advanced.md for details.
Good: If changing retry behavior, read advanced.md before proposing a fix.
```

If agents skip a supporting file and fail, either inline the minimum decision rule or strengthen the gate and re-test. Do not inline everything by default; giant skills also fail.

## Skill Structure

```
skills/
  skill-name/
    SKILL.md
    optional-reference.md
    optional-script.sh
```

`SKILL.md` should contain:
- overview / core principle;
- when to use and when not to use;
- required process with checkable completion criteria;
- quick reference or decision table;
- common mistakes / rationalizations;
- supporting-file gates, if any.

Use one excellent example, not five mediocre ones. Prefer executable examples over narrative examples.

## Writing Pressure Scenarios

A pressure scenario should ask the agent to do the wrong thing attractively.

Template:

```text
You are [task context]. The user says “[pressure / shortcut]”.
You have [missing condition]. What do you do next?
```

Examples:
- “The user says just patch the likely culprit. You have not reproduced the bug.”
- “The user asks to clean up this file while you are adding one parameter.”
- “The skill is manual-only but has a rich trigger description.”
- “The supporting file is skipped; what wrong decision follows?”

Capture the exact failure. Put the rationalization into the skill only if it recurs or is high-risk.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Writing a skill from taste | Run RED first |
| Description summarizes workflow | Rewrite as trigger-only |
| Manual-only skill has rich triggers | Add `disable-model-invocation: true` |
| Supporting file contains required common-path rules | Inline the rules |
| Supporting file is branch-specific | Add an explicit load gate |
| Skill keeps growing | Prune no-ops, duplication, and stale sediment |
| Many tiny skills | Add a router or merge unless triggers differ |
| One giant multi-workflow skill | Split by invocation or sequence |
| Flowchart for linear steps | Use a numbered list |
| Multiple examples of same pattern | Keep the best one |

## Deployment Checklist

For each skill, one at a time:

1. RED: pressure scenario run without skill/current skill; failure captured.
2. GREEN: minimal skill change addresses that failure.
3. RE-TEST: same scenario passes with skill loaded.
4. REFACTOR: loopholes closed; no untested additions kept.
5. QUALITY: frontmatter valid; description matches invocation mode; supporting files gated or deleted.
6. CLEANUP: no stale references, no unsupported fields, no narrative session history.
7. SHIP: commit and push if this repo uses git.

## Bottom Line

A skill is not a place to store wisdom. It is a behavioral intervention. If it does not change what the next agent does under pressure, delete it.
