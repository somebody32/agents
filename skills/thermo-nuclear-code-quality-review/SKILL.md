---
name: thermo-nuclear-code-quality-review
description: Use when running an unusually strict code quality review focused on maintainability, structural simplification, abstraction quality, spaghetti growth, giant files, type boundaries, and whether a branch should be blocked despite passing tests. Use when the user says thermo-nuclear review, thermonuclear review, harsh maintainability review, deep code quality audit, or review this branch aggressively.
---

# Thermo-Nuclear Code Quality Review

## Overview

**Core principle:** review for structural maintainability, not just correctness. Passing tests do not justify making the codebase harder to change.

This is a review skill, not an editing skill. Do not refactor during the review. Produce high-conviction findings and an approval decision.

## The Iron Law

```
DO NOT APPROVE STRUCTURAL REGRESSION JUST BECAUSE BEHAVIOR WORKS.
```

Block or strongly challenge changes that add lasting complexity when a plausible simpler structure exists.

## Review Setup

Review the current branch diff and enough surrounding code to judge structure.

Prefer starting points:

```bash
git status --short
git diff --stat
git diff --name-only
git diff <base>...HEAD
```

If the base is unclear, ask or use the repo’s default branch/merge-base. Note commands you could not run.

Check whether any changed file crosses the 1000-line threshold because of the PR. A file going from under 1000 lines to over 1000 lines is a presumptive code-quality blocker unless strongly justified.

## What to Hunt For

Prioritize these over naming nits:

1. **Code-judo opportunities** — a reframing that deletes concepts, branches, helpers, modes, or layers instead of polishing them.
2. **Spaghetti growth** — feature-specific `if` branches, flags, nullable modes, or special cases scattered through unrelated flows.
3. **Structural regression** — a cohesive module becomes larger, more coupled, more stateful, or harder to scan.
4. **Thin abstractions** — wrappers, resolvers, adapters, or helpers that only forward arguments and add indirection without hiding complexity.
5. **Type-boundary decay** — `any`, `unknown`, casts, broad optionality, or silent fallbacks that obscure the real invariant.
6. **Wrong layer / canonical home** — feature logic leaks into shared paths, or bespoke helpers duplicate existing canonical utilities.
7. **Non-atomic orchestration** — related updates can partially apply; independent async work is serialized in a way that makes the flow more brittle.
8. **File sprawl** — giant files/components/modules that should be decomposed before more logic lands.

## Primary Questions

For every meaningful change, ask:

- Is there a code-judo move that makes this dramatically simpler?
- Can the state model change so branches disappear?
- Did this add conditionals where a better abstraction/model should exist?
- Is the logic in the canonical layer or did it leak across a boundary?
- Is this abstraction earning its keep or just wrapping?
- Are types expressing the invariant, or are casts/optionals hiding it?
- Did the PR make a busy file cross 1000 lines?
- Does the diff move complexity around without deleting it?

## Preferred Remedies

Suggest structural remedies, not cosmetic polish:

- Delete an unnecessary layer or wrapper.
- Reframe the state model so conditionals disappear.
- Move feature-specific logic behind a dedicated boundary.
- Extract a focused helper/module only when it reduces concepts the reader must hold.
- Replace repeated conditionals with a typed model, policy, dispatcher, or explicit state machine.
- Move logic to the package/module/layer that owns the concept.
- Reuse an existing canonical helper.
- Make a type boundary explicit instead of casting through it.
- Make related updates atomic when partial state is hard to reason about.
- Parallelize independent work only when it simplifies orchestration, not as micro-optimization.

Do not settle for “rename this” when the real problem is structural.

## Output Format

Keep the review short and high-signal. Prefer fewer high-conviction findings over a long nit list.

```md
## Verdict
REQUEST CHANGES | APPROVE WITH MAJOR COMMENTS | APPROVE

<one-paragraph summary of structural risk>

## Structural Findings

### 1. [Blocker|Major] <title>
**Evidence:** <files / diff shape / line references if available>
**Why this matters:** <maintainability risk>
**Code-judo option:** <simpler framing, if visible>
**Requested change:** <concrete action>

## Nits / minor comments
<only if they do not distract from structural issues>

## Approval bar
<why this does or does not meet the bar>
```

## Approval Bar

Do **not** approve if any are true and not convincingly justified:

- The branch preserves incidental complexity when a plausible simpler model would delete it.
- The branch pushes a file from below 1000 lines to above 1000 lines.
- The branch scatters feature checks across shared code.
- The branch adds ad-hoc branching to an already busy flow.
- The branch introduces a thin wrapper or abstraction that does not reduce complexity.
- The branch relies on casts/optionality instead of a clear invariant.
- The branch duplicates canonical helpers or puts logic in the wrong layer.
- The branch technically passes tests but makes future correctness harder to reason about.

Approve only when there is no clear structural regression, no obvious missed simplification, and no maintainability blocker.

## Tone

Be direct, serious, and demanding. Do not be rude. Do not soften structural problems into optional polish.

Useful phrases:

- “This works, but it makes the surrounding code more spaghetti.”
- “I think there is a code-judo move here that deletes this branch instead of centralizing it.”
- “This abstraction is not earning its keep; it adds indirection without hiding complexity.”
- “This pushes the file past 1k lines. Can we decompose before adding more logic?”
- “The type boundary is telling us the invariant is unclear. Let’s model it instead of casting through it.”
- “This is feature logic leaking into a shared path; can we move it behind a dedicated boundary?”

## Relationship to Other Skills

- Use `surgical-edits` if the user later asks you to apply fixes. Review findings do not authorize broad edits.
- Use `placing-code-in-layers` when the issue is about domain/application/infrastructure placement.
- Use `shaping` if the remedy requires redesign or choosing among structural options.
- Use `tdd` when implementing requested fixes.
