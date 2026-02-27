---
name: systematic-debugging
description: ALWAYS read before debugging any bug, test failure, or unexpected behavior. Use before reading source code to understand a problem. Use before proposing any fix. Use when investigating how existing code actually behaves at runtime. Use when modifying code you haven't run yet.
---

# Systematic Debugging

## Overview

**Core principle:** Reproduce, observe, then fix. Never reason about bugs from code alone.

Random fixes waste time. Reading code to "understand" bugs is theorizing, not debugging. The system tells you what's wrong — if you run it.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT REPRODUCTION FIRST
```

If you haven't reproduced the bug, you cannot propose fixes. Reading code is not reproducing.

## Reproduce First

**The #1 debugging mistake: reading code instead of running code.**

Reading code tells you what COULD happen. Running code tells you what DOES happen. Write a throwaway script, run it, observe.

```
WRONG:
  1. Read error report
  2. Read source file A (200 lines)
  3. Read source file B (150 lines)
  4. Read source file C (100 lines)
  5. Think: "I see the issue — X calls Y with wrong param"
  6. Propose fix

RIGHT:
  1. Read error report
  2. Write 10-line script that triggers the bug
  3. Run it → observe actual output
  4. Add logging → run again → see WHERE it breaks
  5. NOW read only the file that's actually broken
  6. Fix
```

**Throwaway scripts are your primary tool.** They're cheap, fast, and tell you the truth. Code reading lies to you — you see what you expect, not what's there.

### What a reproduction script looks like

```typescript
// throwaway.ts — DELETE AFTER DEBUGGING
import { createCart, checkout } from './src/cart';

const cart = createCart();
cart.add({ name: 'Widget', price: 100 });
cart.applyDiscount('10%');

console.log('Subtotal:', cart.subtotal);
console.log('Discount:', cart.discount);
console.log('Tax:', cart.tax);
console.log('Total:', cart.total);
console.log('Expected:', 94.5);
```

Run it. The output tells you more than reading 500 lines of source.

### When you can't write a script

Some bugs need specific state, user interaction, or infrastructure. In these cases:
- Add temporary logging/instrumentation to the real code path
- Run the existing test that fails with `--verbose` or extra assertions
- Use the debugger with a breakpoint at the symptom

**The goal is always the same: observe actual runtime behavior, not theorize from source.**

### Performance & Scaling

For performance changes, the reproduction step is different: **estimate workload × per-unit cost before analyzing code correctness.** If the back-of-envelope math fails, the code doesn't matter.

```
"This optimization handles N items. How big is N in production?
 Current cost per item is X seconds. N × X = ??? vs timeout."
```

One multiplication can kill a premise that hours of code analysis won't question. Do the arithmetic first.

## The Process

### Phase 1: Reproduce & Observe

1. **Read the error message** — fully. Stack trace, line numbers, error codes. Don't skim.

2. **Write a reproduction** — throwaway script, failing test, or curl command. Whatever triggers the bug with minimal setup.

3. **Run it and observe** — does it fail the way you expect? If not, your mental model is already wrong. Good — now you know.

4. **Add instrumentation** — console.log at key points. What goes in? What comes out? Where does the value go wrong?

5. **Narrow down** — bisect. Comment out half the logic. Does it still fail? Which half is broken?

### Phase 2: Root Cause

**Now — and only now — read the code.** You know WHERE it breaks from Phase 1. Read only that code.

1. **Trace backward** — from the symptom to the source. Where does the bad value originate? See [root-cause-tracing.md](root-cause-tracing.md).

2. **Check recent changes** — `git log --oneline -- <file>` on changed files. Read ALL commits, not keyword searches. The **direction** of changes tells you what the team has learned. Three commits increasing parallelism means "this workload doesn't fit in one job." Two hotfixes adding resets means "state leaks here."

3. **Compare working vs broken** — find similar working code. What's different?

4. **Falsify before committing** — State your theory as a testable prediction: **"This works IF ___."** Then find the ONE number that would kill it. Check that number FIRST.

```
WRONG:
  "I found evidence supporting my theory → I'm done"

RIGHT:
  "This works IF precompute finishes within 1440s for 3000 employees."
  "Current batches of 50 employees take 1433s. 3000/50 = 60x. Dead."
  Check THAT before presenting anything.
```

### Phase 3: Fix & Verify

1. **Write a failing test** that reproduces the bug (your throwaway script becomes a real test)

2. **Form one hypothesis** — "X is the root cause because Y." Be specific.

3. **Make the smallest possible change** — one variable at a time. Don't fix multiple things at once.

4. **Verify** — test passes? All other tests still pass? Ship it.

5. **Didn't work?** New hypothesis. Don't stack fixes. Return to Phase 1 with new information.

## Multi-Component Systems

When the system has multiple layers (API → service → database, CI → build → deploy):

**Instrument every boundary BEFORE proposing fixes:**

```bash
# Layer 1: API
echo "=== Request received: ==="
echo "Headers: $HEADERS"
echo "Body: $BODY"

# Layer 2: Service
echo "=== Service input: ==="
echo "Parsed data: $DATA"

# Layer 3: Database
echo "=== Query: ==="
echo "SQL: $QUERY"
echo "Params: $PARAMS"
```

Run once. The output shows WHERE data goes wrong — which layer corrupts it. Then read only that layer's code.

### Victims vs Perpetrators in Cascading Failures

**The component throwing the most errors is often the VICTIM, not the cause.**

A slow query or resource hog doesn't throw errors — it silently consumes I/O, connections, or locks. The components that time out waiting for it fill your error logs. Error count ≠ causation.

**To distinguish victims from perpetrators:**
1. Which component is NEW or CHANGED? Perpetrators are usually recent changes.
2. Which component is silent? Perpetrators often don't error — they just consume resources.
3. What happens when the suspected perpetrator is removed/fixed? Compare before vs after.

```
WRONG:
  "Service A has 500 errors, Service B has 0 → A is the cause"

RIGHT:
  "Service A has 500 errors, Service B has 0 → B may be silently
   starving A. What changed recently? What happens if we fix B?"
```

## Reviewing Existing Analyses

When a postmortem, bug report, or colleague already has a theory: **test THEIR hypothesis before building your own.**

1. **Extract testable claims** — what specifically does the analysis predict?
2. **Check those predictions first** — does the timeline match? Does before/after the fix match?
3. **Only then** look for what they missed.

**Key anti-pattern:** "I found problem B" does NOT disprove "problem A was the cause." Finding a different issue doesn't invalidate the original analysis — you must directly test the original claim.

```
WRONG:
  Read postmortem → find different problem → "postmortem was wrong"

RIGHT:
  Read postmortem → test their specific claims → confirmed or disproved
  → THEN look for additional factors
```

## The 3-Fix Rule

Tried 3 fixes and none worked? **STOP.**

This is not a bug — it's an architecture problem.

- Each fix reveals new coupling/shared state
- Fixes require "massive refactoring"
- Each fix creates new symptoms elsewhere

**Discuss with user before attempting fix #4.** Question whether the pattern is fundamentally sound, not whether you need one more fix.

## Red Flags — STOP

If you catch yourself:
- Reading 3+ source files before running anything
- Saying "I think the issue is..." without reproduction
- Proposing a fix from code reading alone
- "Just try changing X and see"
- Stacking multiple changes in one attempt
- On fix #3 and about to try fix #4
- "I don't fully understand but this might work"
- Skipping the reproduction because "it's obvious from the code"
- Building a counter-theory to an existing analysis without testing the original claim first
- Using error counts to determine causation in a multi-component system
- Declaring the loudest component "the cause" without checking for silent perpetrators
- 30+ minutes deep in one analysis thread without checking basic constraints (timeouts, scale, resources)
- Analyzing code correctness of a performance change without estimating workload × cost first
- Searching git history for keywords instead of reading `git log --oneline -- <file>`

**All of these mean: STOP. Write a reproduction script first.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I can see the bug in the code" | You see what you expect. Run it and prove it. |
| "Writing a script takes too long" | 10 lines, 2 minutes. Reading 5 files takes longer and tells you less. |
| "It's obvious, just need a quick fix" | Obvious bugs have non-obvious root causes. Reproduce first. |
| "I'll read one more file to understand" | You're theorizing. Stop reading, start running. |
| "Can't reproduce, too complex" | Add logging to the real code path. Observe, don't guess. |
| "Just try this first, then investigate" | First fix sets the pattern. Reproduce first. |
| "Issue is simple, don't need process" | Simple issues have root causes. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check thrashing. |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem. Stop fixing. |
| "The postmortem is wrong because I found a different problem" | Finding problem B doesn't disprove problem A. Test the original claim directly. |
| "This component has the most errors, so it's the cause" | Loudest component is often the victim. Check what's silent and what changed. |
| "I'll check scaling after I understand correctness" | If it can't finish, correctness doesn't matter. Check constraints first. |
| "This analysis is complex, I need to finish it" | 30 min on one thread without checking basics = tunnel vision. Stop and check constraints. |

## After the Fix

Once root cause is fixed, harden:

- **Validate at every layer** data passes through — make the bug structurally impossible. See [defense-in-depth.md](defense-in-depth.md).
- **Keep the test** — your reproduction script becomes a regression test.
- **Remove instrumentation** — clean up temporary logging.

## When Stuck

| Problem | Solution |
|---------|----------|
| Can't reproduce | Add logging to real code path, run in production-like env |
| Reproduced but can't narrow down | Bisect — comment out half, does it still fail? |
| Found symptom, not root cause | Trace backward through call chain. See [root-cause-tracing.md](root-cause-tracing.md) |
| 3+ fixes failed | Architecture problem. Stop and discuss with user |
| Truly environmental/timing | Document investigation, add monitoring, handle gracefully |

## Supporting Files

- **[root-cause-tracing.md](root-cause-tracing.md)** — Trace bugs backward through call stack to find the original trigger
- **[defense-in-depth.md](defense-in-depth.md)** — Add validation at multiple layers after finding root cause
- **[find-polluter.sh](find-polluter.sh)** — Bisection script to find which test creates unwanted state
