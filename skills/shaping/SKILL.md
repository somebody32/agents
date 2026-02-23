---
name: shaping
description: Use when planning features, designing changes, or scoping work before implementation. Use when user says plan, design, think through, shape, or how should we approach. Use before building anything non-trivial in a brownfield codebase.
---

# Shaping

Define the problem before exploring solutions. Never propose HOW until you've agreed on WHAT.

Inspired by the [Shape Up](https://basecamp.com/shapeup) methodology: separate problem from solution, compare options against requirements, slice vertically.

## The Iron Law

**NO IMPLEMENTATION BEFORE ALIGNMENT.**

Do not edit code, create files, run generators, or commit during shaping. The output is a shared understanding and a plan — not code.

## Phases

### Phase 1: Investigate

Read the codebase silently before saying anything. Understand:

- What exists in the area of change
- What patterns the codebase uses
- What adjacent systems connect to it
- What would be affected

You may discover the request is already partially solved. Say so.

You may also discover existing patterns that are wrong or fragile. Flag them — don't silently replicate them.

Do not summarize your reading. Do not propose anything yet. Just build context.

### Phase 2: Problem

Define WHAT is needed, not HOW to build it.

Write down requirements as a numbered list. Requirements describe outcomes and constraints — not implementations:

- ✅ "Users can create cards from predefined structures" (outcome)
- ❌ "Create a CardTemplate model with JSON column" (implementation)
- ✅ "Templates preserve rich text and attachments" (constraint)
- ❌ "Use ActionText for template content" (implementation)

**Interview the user.** Walk the design tree depth-first, one decision at a time. Each question should:

- Reference what you found in the codebase ("I see you're using ActionText for card content — should templates preserve formatting, or plain text only?")
- Resolve one decision before moving to the next
- Follow dependency order — don't ask about error handling before the data model
- Prefer multiple choice over open-ended when the options are clear

Keep going until you've walked every branch. Don't stop after 2 questions because it "feels like enough." But don't ask questions you can answer from the code yourself.

**Define the acceptance proof.** Before moving to options, answer: "How will we know this works?" The answer must be observable behavior, not "tests pass":

- ✅ "Thinking indicator appears in chat when agent calls queryData" (observable)
- ❌ "All unit tests pass" (proves nothing about runtime)
- ✅ "POST /api/templates returns 201 and GET /api/templates lists it" (verifiable)
- ❌ "Code looks correct" (opinion, not proof)

If you can't verify it yourself, say what the user should check: "I can't run the frontend. After deploy, open chat, ask a data question, confirm you see the spinner."

The output is a requirements list + acceptance proof you both agree on.

### Phase 3: Options

Propose 2-3 approaches. Each option is a concrete mechanism, not a vague direction:

- ✅ "A: Polymorphic Template model with has_one content association, reuses existing ActionText pipeline"
- ❌ "A: Use the database"

Compare options against requirements:

```
| Requirement              | A: Polymorphic | B: JSON column | C: Duplicate card |
|--------------------------|:-:|:-:|:-:|
| R1: Preserve rich text   | ✅ | ❌ | ✅ |
| R2: Board-scoped         | ✅ | ✅ | ❌ |
| R3: < 2 migrations       | ❌ | ✅ | ✅ |
```

Rules:
- ✅ or ❌ only. No "maybe" or "partially." If you can't say yes, it's no.
- If an option fails a requirement, explain briefly in notes below the table.
- **Flag unknowns:** If you described WHAT but don't know HOW, mark it ⚠️. A flagged unknown means ❌ until resolved.
- If only one viable option exists, say so and explain why alternatives don't work.
- **If all options pass but one feels wrong, there's a missing requirement.** Articulate it and add it to the list.

### Phase 4: Recommend and Align

Lead with YOUR recommendation and reasoning. Don't present options as equally valid if they aren't. Challenge the user's original approach if investigation revealed problems.

Then **wait for the user's decision.** Do not proceed until they choose.

### Phase 5: Slice

Break the chosen approach into vertical slices. Each slice must be demo-able — a user can see something working.

WRONG (horizontal layers):
```
1. Create database migrations
2. Build API endpoints
3. Add UI components
```

RIGHT (vertical slices):
```
1. User can save an existing card as a template (migration + model + one button)
2. User can create a new card from a template (template picker + card creation)
3. User can manage templates (list, edit, delete)
```

Each slice cuts through all layers (data, logic, UI) and delivers a working increment.

## Scaling

Not every task needs full shaping.

| Signal | Response |
|--------|----------|
| Clear approach, < 3 files touched | State what "done" looks like + quick options + go. |
| Design decisions needed, 3-10 files | Full phases. Requirements list + acceptance proof + options table. |
| Architectural, > 10 files, multi-system | Full phases + written plan document + spikes for unknowns. |

**Verification never scales down.** At every scale, state what "done" looks like before building. One sentence is enough: "I'll rename the method, update 2 call sites, and run the existing tests. If you have a page that uses this, reload it to confirm."

When the user says "just do it" or the task is genuinely trivial, don't force process. Say what you'd do and ask for a thumbs up.

## The Interview

The interview is the core mechanism of shaping. It is how you and the user build shared understanding.

### How to interview

**Depth-first, not breadth-first.** Don't ask about scope, permissions, UI, AND error handling in one message. Pick the most foundational decision, resolve it completely, then move to the next.

Design tree for "add card templates":
```
Templates
├── What IS a template? → resolve first (everything else depends on this)
│   ├── Content snapshot → how handle rich text?
│   └── Structure only → what fields included?
├── Scope → resolve second
│   ├── Board-scoped → cross-board?
│   └── Account-wide → permissions?
└── Application → resolve third
    ├── New card only
    └── Replace existing → destructive?
```

**One decision per message.** "Should templates capture content (rich text, attachments) or just structure (field names, checklists)?" — not a paragraph with 5 sub-questions.

**Multiple choice when options are clear.** "I see three ways to scope this: (A) board-level, (B) account-wide, (C) both with board override. Given your current permission model uses board membership, A would be simplest. What fits?"

**Challenge with evidence.** Don't just accept the user's framing. "You mentioned a JSON column, but your cards use ActionText with embedded attachments — JSON would lose that. Should we explore approaches that preserve the existing content pipeline?"

**Know when to stop.** When the requirements list is stable and you're asking questions that don't change it, stop interviewing and move to options.

## Spikes

When an option has a flagged unknown (⚠️), you may need a spike: a focused investigation to answer "can we actually do this?" before committing.

A spike is NOT implementation. It's reading code, checking APIs, writing throwaway scripts to verify assumptions. The output is knowledge: "yes, ActionText supports cloning with `record.dup`" or "no, the attachment system doesn't support cross-record references."

Spike when the unknown would change which option you pick. Don't spike things you'll figure out during implementation.

## Completion

When you finish implementation, your final message MUST include a **Verification** section. This is mandatory at every scale — from one-line changes to architectural work.

Format:
```
### Verification
- [automated] All 10 tests pass, covering [specific behaviors]
- [manual] Open /settings, toggle the feature flag, confirm the banner disappears
- [manual] I can't run the app — after deploy, POST to /api/X and check the response includes Y
```

Rules:
- Every verification item is tagged `[automated]` or `[manual]`
- At least one item must describe observable behavior beyond "tests pass"
- If you can't verify something yourself, say what the user should check and how
- If the change is purely internal (no UI, no API), describe what downstream behavior would break if your change were wrong

"All tests pass" is necessary but never sufficient. A test can pass while the feature is broken if the test doesn't exercise the real integration.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| "Done" defined as "tests pass" | Name observable behavior: what does the user see/get? |
| Can't verify but doesn't say so | "I can't run the app. After deploy, check X by doing Y." |
| Requirements that are implementations ("use PostgreSQL") | Rewrite as outcome ("data persists across restarts") |
| Single option presented as "the obvious approach" | Explore at least one alternative, even if to explain why it's worse |
| Horizontal slicing ("Phase 1: database") | Each slice must have visible UI that can be demoed |
| Interviewing from ignorance ("what framework do you use?") | Read the code first, then ask informed questions |
| 10 questions in one message | One decision at a time, depth-first |
| Deciding everything unilaterally | Present options, wait for user decision |
| Shaping a trivial task | "I'd rename the method and update 2 call sites. Good?" |
| Replicating existing patterns without evaluating correctness | "I see 10 tests mocking X. Do those mocks match reality? Let me verify against the real code." |
