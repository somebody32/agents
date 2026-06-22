---
name: systematic-debugging
description: Use when debugging any bug, failing test, flaky behavior, performance regression, unexpected runtime behavior, or reviewing an existing bug theory/postmortem. Use before reading source code to explain a symptom, before proposing a fix, or when tempted to patch from inspection.
---

# Systematic Debugging

## Overview

**Core principle:** build a tight feedback loop, observe reality, trace to root cause, then fix. Reading code tells you what could happen. Running the system tells you what does happen.

Throwaway scripts, repro harnesses, temporary logs, and probes are exempt from TDD's production-code rule. They exist to be deleted. The eventual fix still needs a regression test when a correct seam exists.

## The Iron Law

```
NO FIX, NO THEORY, NO SOURCE-DIVING BEFORE A TIGHT LOOP EXISTS.
```

A **tight loop** is one command you have already run that can go red on the user's exact symptom and green after the fix. If you do not have it, your job is to create it — not to inspect files until a plausible patch appears.

Completion criterion for Phase 1:

- **Red-capable:** exercises the real failing path and asserts the exact symptom, not merely "doesn't crash".
- **Deterministic enough:** same verdict every run; for flakes, raise reproduction rate with loops/stress until debuggable.
- **Fast:** seconds if possible; narrow setup until iteration is cheap.
- **Agent-runnable:** one unattended command. Human-in-the-loop only through a scripted prompt/checklist.

If you cannot build such a loop, stop and say what you tried. Ask for access, a captured artifact (HAR/log/core dump/screen recording), or permission to add temporary instrumentation. Do not proceed to theories without a loop.

## Phase 1 — Build the Feedback Loop

Try, roughly in this order:

1. Failing test at the highest seam that reaches the bug.
2. `curl`/HTTP script against a running service.
3. CLI invocation with fixture input and asserted output.
4. Browser script for UI bugs: DOM, console, network assertions.
5. Replay captured trace/request/event log through the real path.
6. Throwaway harness that calls the failing code path directly.
7. Property/fuzz/stress loop for "sometimes wrong" behavior.
8. Bisection/differential loop: old vs new version, config A vs B, `git bisect run`.
9. Human-in-the-loop script when clicking is unavoidable: tell the human exactly what to do and what verdict to report.

Treat the loop as a product. Once it exists, tighten it: cache setup, cut unrelated init, pin time/randomness, isolate filesystem/network, assert sharper symptoms.

For test pollution, isolate the filesystem before checking. If the symptom is ".git appears in package root", do not run destructive cleanup in the real repo; run in a temp copy/worktree with the real `.git` excluded:

```bash
src="$PWD"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsync -a --exclude .git "$src"/ "$tmp"/
cd "$tmp"
npm test >/tmp/test.log 2>&1 || { cat /tmp/test.log; exit 2; }
test ! -e .git || { echo "pollution: .git created"; cat /tmp/test.log; exit 1; }
```

Once the suite-level loop is red, minimise to files/chunks/order in the same isolated environment. The point is automated isolation: one command in, pollution verdict out.

## Phase 2 — Reproduce and Minimise

Run the loop and watch it fail. Confirm it is the user's bug, not a nearby failure you accidentally created.

Then minimise. Remove inputs, callers, config, data, timing, and steps one at a time, re-running after every cut. Stop only when every remaining element is load-bearing: removing any one makes the loop green. A minimal repro shrinks the hypothesis space and becomes the regression test candidate.

## Phase 3 — Find Root Cause

Only now read code — and read the smallest area implicated by the loop.

Trace backward from symptom to source:

1. Where is the bad output/error observed?
2. What immediate value/state caused it?
3. Who called this with that value/state?
4. Repeat until you find the original trigger.

Never fix only where the error appears. Bugs often throw deep in the stack while the cause is five layers up: bad setup, wrong invariant, stale cache, missing validation, caller order, or cross-test pollution.

Before testing fixes, write **3–5 ranked hypotheses**. Each must be falsifiable:

> If X is the cause, then changing/observing Y will make the loop go green or Z will be true.

Single-hypothesis debugging anchors on the first plausible idea. Rank, then test one variable at a time.

Check recent history on files you will rely on:

```bash
git log --oneline -- path/to/file
```

Read the direction of changes, not just keyword hits. Repeated commits increasing batching, adding resets, or widening guards are evidence of constraints the team already learned.

## Special Cases

### Performance regressions

Measure before reasoning about correctness. Establish workload × per-unit cost and compare with the real limit:

```
N items × current cost/item = total time / memory / queries
```

If the arithmetic cannot fit, code aesthetics are irrelevant. Use a timing harness, profiler, query plan, or production metric. Logs are usually the wrong first tool for performance.

### Multi-component failures

The loudest component is often the victim. A silent component may be starving queues, locks, DB connections, CPU, or I/O.

Instrument boundaries before blaming:

- request received → parsed service input → outbound call/query → response/result;
- what changed recently;
- what happens when the suspected silent perpetrator is removed, throttled, or fixed.

Error count is not causation.

### Existing analysis or postmortem

Test their hypothesis before building yours. Extract their concrete predictions and check them directly. Finding another problem does not disprove the original theory.

## Phase 4 — Instrument Carefully

Each probe must distinguish hypotheses. Prefer debugger/REPL inspection when available; otherwise add targeted logs at boundaries. Never "log everything and grep".

Tag every temporary log with a unique prefix:

```ts
console.error("[DEBUG-a4f2] before charge", { orderId, total, stack: new Error().stack });
```

Log before dangerous operations, include values that choose the branch, and include stack traces when caller order matters. Use `console.error` in tests if normal logging is suppressed.

## Phase 5 — Fix with a Regression Test

If a correct seam exists, turn the minimised repro into a failing regression test before changing production code. A correct seam exercises the real bug pattern as it occurs at the call site. If the only possible test is too shallow or mocks away the bug, do not add false confidence; document that the architecture lacks a good seam.

Then:

1. Watch the regression test fail for the expected reason.
2. Make the smallest fix.
3. Watch it pass.
4. Re-run the original Phase 1 loop, not only the minimised test.
5. Run affected tests/checks.

If a fix fails, do not stack another fix on top. Revert or isolate it, update hypotheses, and test one new variable. After three failed fixes, stop: the pattern is probably architectural, not a one-line bug.

## Phase 6 — Harden and Clean Up

After root cause is known, make the bug structurally harder to reintroduce. For invalid data, validate at every layer it crosses:

1. **Entry point:** reject bad external input early.
2. **Use case/business rule:** assert invariants required for the operation.
3. **Dangerous edge:** guard irreversible or context-sensitive operations (filesystem, money movement, deletes, network writes).
4. **Observability:** keep durable diagnostic context only if it would help future incidents; remove throwaway logs.

Cleanup checklist before declaring done:

- Original loop is green.
- Regression test passes, or lack of seam is explicitly reported.
- All `[DEBUG-...]` logs/probes are removed: `grep -R "\[DEBUG-" .`.
- Throwaway scripts/harnesses are deleted or clearly marked outside production paths.
- The root cause is stated in the final answer/commit message.

## Red Flags — STOP

- Reading 3+ source files before running anything.
- Saying "I think the issue is…" without a red-capable loop.
- Proposing a fix from inspection.
- Skipping repro because the bug is "obvious" or urgent.
- Stacking multiple changes in one attempt.
- Debugging a flake with a loop that rarely fails.
- Treating the throwing component as the cause without boundary evidence.
- Analyzing performance without workload × cost math.
- Disproving an existing analysis by finding a different problem instead of testing its predictions.
- Searching git history for keywords instead of reading recent commits on the relevant files.
- Trying fix #4 after three failed fixes.

All of these mean: stop, build/tighten the loop, and observe reality.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "I can see the bug in the code." | You see what you expect. Run it. |
| "A script takes too long." | Ten lines beat reading five files. |
| "It's a tiny fix." | Tiny fixes still need proof. |
| "I'll read one more file first." | You're theorizing. Run the path. |
| "Can't reproduce; too complex." | Add instrumentation to the real path or ask for artifacts. |
| "Let's just try this." | Guess-and-check creates new symptoms. |
| "The flaky rate is low." | Raise the reproduction rate before debugging. |
| "The service with errors is the cause." | It may be the victim. Check boundaries. |
| "Tests after are enough." | Tests-after prove less; write the regression before the fix when a correct seam exists. |
| "No good test seam exists, so skip the point." | That is an architectural finding. Say it. |
| "Emergency means no process." | Emergencies punish guesses hardest. A tight loop is the fast path. |
