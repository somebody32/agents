---
name: shaping
description: Use when planning features, designing changes, stress-testing ideas, scoping work, or deciding how to approach non-trivial implementation. Use when the user says plan, design, shape, grill, think through, prototype the idea, or asks for an implementation plan.
---

# Shaping

## Overview

**Core principle:** align on the problem and reduce uncertainty before production implementation. Do not propose HOW until WHAT is clear; do not produce a plan that hides unresolved decisions.

Shaping is not ceremony. It chooses the smallest artifact that makes the next implementation step safe: a one-sentence scope, a grilling question, a prototype, a decision map, or agent-ready vertical slices.

## The Iron Law

```
NO PRODUCTION IMPLEMENTATION BEFORE ALIGNMENT.
```

Do not edit production code, create migrations, generate files, or commit while shaping. Throwaway prototypes are allowed only when they answer a specific question and are clearly marked to delete or absorb later.

## Choose the Mode First

| Situation | Mode |
|---|---|
| Clear change, <3 files, no real design decision | State done criteria + quick approach; ask for thumbs up |
| Non-trivial feature/design in a codebase | Full shaping |
| User wants to stress-test an idea / “grill me” | Grilling loop |
| A question cannot be answered from prose | Throwaway prototype |
| Too many unknowns for one session | Decision map |
| Multiple agents/days of implementation | Agent-ready PRD/issues/plan |

If you pick the wrong mode, say so and switch. Do not force full shaping onto trivial work; do not fake certainty on fog-of-war work.

## Phase 1 — Investigate

Read the codebase silently before asking questions when code can answer them. Understand:

- existing behavior and vocabulary;
- patterns the codebase uses;
- adjacent systems affected;
- tests and seams already present;
- recent direction: `git log --oneline -- <file>` for files you rely on.

Verify runtime assumptions by running code, throwaway scripts, tests, or grep. Reading tells you what could happen; running tells you what does happen.

Output only what changes the conversation: “this already exists”, “this pattern is fragile”, or “the code contradicts the premise”.

## Phase 2 — Define WHAT

Write requirements as outcomes and constraints, not implementations:

- Good: “Users can create templates from existing cards.”
- Bad: “Add `CardTemplate` with a JSON column.”

Define acceptance proof before options:

- observable behavior, API response, UI state, or manual check;
- not merely “tests pass”.

If you cannot verify something yourself, state the manual check the user must do.

## The Grilling Loop

Use when the plan/design needs sharpening. Walk the design tree depth-first.

Rules:
- Ask **one decision question at a time**.
- Give **your recommended answer** with the question.
- Prefer multiple choice when options are clear.
- Reference code evidence when available.
- If code can answer it, inspect code instead of asking.
- Resolve foundational decisions before downstream ones.

Format:

```md
Foundational decision: <decision>
Options:
A. ...
B. ...
C. ...
My recommendation: <option> because <evidence/tradeoff>.
Which one matches your intent?
```

Do not dump a questionnaire. Ten questions at once is avoidance disguised as diligence.

Stop grilling when requirements are stable and new questions no longer change the plan.

## When Prose Is Not Enough: Prototype

A prototype is throwaway code that answers one question.

Use when:
- state/business logic is hard to judge in prose;
- UI direction needs to be seen, not described;
- an option has a critical unknown that changes the recommendation.

Rules:
- State the question first: “This prototype answers whether ___.”
- Make it runnable with one command.
- No persistence by default.
- No polish, abstractions, or production integration.
- Surface the relevant state after every action.
- When done, capture the answer and delete or absorb the prototype.

Default shapes:
- logic/state model → tiny terminal/script prototype;
- UI direction → several visibly different variants behind one route or toggle.

Do not call production implementation a prototype. If it must be kept, it is implementation and needs normal TDD/verification.

## When There Is Fog of War: Decision Map

Use when a loose idea has more uncertainty than one shaping session can resolve.

Create a compact decision map instead of a fake implementation plan. Each ticket answers one blocking question and is sized for one agent session.

```md
# Decision Map: <idea>

## #1: <question>
Blocked by: none | #n
Type: Research | Prototype | Discuss

### Question
<the decision to resolve>

### Answer
<empty until resolved>
```

Ticket types:
- **Research** — external docs, APIs, prior art, codebase archaeology.
- **Prototype** — runnable artifact to test behavior or UI.
- **Discuss** — grilling conversation to resolve product/domain choices.

Stop after creating the map unless the user explicitly asks to resolve ticket #1 now. Push back the fog one node at a time.

Skip the map if grilling resolves all decisions in-session.

## Phase 3 — Options

Propose 2–3 concrete mechanisms, not vague directions. Compare against requirements with ✅ / ❌ only. If you cannot say yes, it is no until proven.

Flag unknowns as ⚠️ and spike them before recommending if they could change the choice.

Falsify before recommending:

> This works IF ___.

Then check the condition: run a throwaway script, estimate workload × cost, grep callers, inspect real config, or test the critical API.

If all options pass but one feels wrong, you are missing a requirement. Add it.

## Phase 4 — Recommend and Align

Lead with your recommendation and why. Challenge the user’s preferred approach if investigation disproves it.

Then wait for the decision. Do not proceed to implementation until the user chooses or explicitly accepts your recommendation.

## Phase 5 — Slice for Implementation

Slice vertically by observable capability, not by technical layer.

Bad:
1. database
2. backend
3. frontend
4. tests

Good:
1. User can create X end-to-end.
2. User can view/use X end-to-end.
3. User can edit/delete/manage X end-to-end.

Each slice includes data, logic, UI/API, tests, and acceptance proof. Each should be demoable or verifiable on its own.

For multi-agent work, produce agent-ready slices/issues:

```md
## Slice: <observable capability>
Goal: <what user/consumer can now do>
Scope: <included>
Acceptance proof:
- [automated] ...
- [manual] ...
Dependencies: none | <slice ids>
Out of scope: <explicit exclusions>
Notes for agent: <patterns, seams, risks>
```

Make dependencies explicit. If agents will work independently, recommend fresh context per slice and a shared PRD/plan as the source of truth.

## Durable Decisions

While shaping, capture durable context when it crystallizes:

- Resolve overloaded domain terms before planning around them.
- If the repo has a glossary/context doc, update it when terminology is settled.
- Offer an ADR only when all three are true:
  1. hard to reverse;
  2. surprising without context;
  3. real trade-off among alternatives.

Do not write ADRs for obvious or temporary choices.

## Completion

A shaping session is complete when you have one of:

- trivial change: done criteria + agreed approach;
- shaped feature: requirements, acceptance proof, chosen option, vertical slices;
- prototype: question answered + decision captured;
- decision map: frontier identified with next ticket;
- multi-agent plan: agent-ready slices with dependencies.

Implementation completion still requires a final **Verification** section:

```md
### Verification
- [automated] ...
- [manual] ...
```

At least one item must be observable behavior beyond “tests pass”.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| “Just build it and we’ll refine” | Shape the minimum decision first |
| Asking what code can answer | Inspect code silently |
| Ten questions at once | One foundational decision at a time |
| Question without recommendation | Give your recommended answer |
| Requirements describe implementation | Rewrite as outcome/constraint |
| Fake plan despite unknowns | Create decision map |
| Prose debate cannot settle behavior | Build throwaway prototype |
| Prototype becomes production | Delete or absorb through normal implementation |
| “Tests pass” as done | Name observable acceptance proof |
| Horizontal slices | Slice vertical tracer bullets |
| ADR for everything | ADR only hard-to-reverse + surprising + trade-off |
