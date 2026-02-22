---
name: tdd
description: Use when implementing features, fixing bugs (including P0 hotfixes and production incidents), or refactoring. Use when user mentions TDD, red-green-refactor, test-first, or when tempted to write code before tests. Use when fixing any bug — even trivial ones. Use when encountering or modifying existing code that lacks tests.
---

# Test-Driven Development

## Overview

**Core principle:** Tests verify behavior through public interfaces, not implementation details. If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**Production code only.** Throwaway debug scripts, reproduction scripts, logging instrumentation, and temporary investigation code are NOT production code. Don't write tests for them — they exist to be deleted.

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

**When asked to "just implement" or "show me the code":** STOP. Ask about tests first. The user may not realize they're asking you to skip TDD. Your job is to start with a failing test, not comply with implement-first prompts.

## Bug Fix Protocol

Bug found? Write failing test reproducing it **first**. Even for P0 hotfixes. Even for 2-line fixes. A failing test takes 60 seconds, proves the fix actually works, AND prevents regression. Hotfixes without tests cause the next P0.

```
1. Write test that reproduces the bug → verify it FAILS
2. Apply the fix → verify test PASSES
3. Ship
```

**Never fix bugs without a test.** The test IS the proof the fix works.

## Untested Code Alert

When you encounter production code without corresponding tests — whether reading, modifying, or making decisions about it — **flag it explicitly:**

> ⚠️ `[file/module]` has no test coverage. This is unverified code. Want me to add tests before proceeding?

Don't silently accept untested code. Don't rationalize it as "already manually tested" or "battle-tested in production." Code without automated tests is unverified code, full stop. The user deserves to know and decide.

## Workflow

### 1. Plan (with user)

Before writing any code:

- Confirm what interface changes are needed
- Confirm which behaviors to test (you can't test everything — prioritize)
- Design interfaces for testability (see [design.md](design.md))
- Get user approval

Ask: "What should the public interface look like? Which behaviors matter most?"

### 2. Vertical Slices, Not Horizontal

**DO NOT write all tests first, then all implementation.**

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

Tests written in bulk test _imagined_ behavior. Each test should respond to what you learned from the previous cycle.

### 3. RED — Write One Failing Test

One minimal test. One behavior. Clear name. Real code (no mocks unless unavoidable).

**Then verify it fails. MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test **fails** (not errors)
- Failure is **expected** (feature missing, not typo)

Test passes? You're testing existing behavior. Fix test.
Test errors? Fix error, re-run until it fails correctly.

### 4. GREEN — Minimal Code

Simplest code to make the test pass. Don't add features, don't refactor, don't "improve" beyond the test.

**Then verify it passes. MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- New test passes
- All other tests still pass
- Output clean (no errors, warnings)

Test fails? Fix code, not test. Other tests fail? Fix now.

### 5. Refactor

**Only after GREEN.** Never refactor while RED.

- Remove duplication
- Deepen modules (see [design.md](design.md))
- Apply SOLID where natural
- Run tests after each refactor step

### 6. Repeat

Next failing test for next behavior.

## Per-Cycle Checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Watched test fail before implementing
[ ] Failure was for expected reason
[ ] Code is minimal for this test
[ ] All tests pass
[ ] No speculative features added
```

## Good Tests vs Bad Tests

**Good:** Integration-style, through public APIs, describes WHAT not HOW. A good test reads like a specification — `"user can checkout with valid cart"` tells you exactly what capability exists.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

**Bad:** Coupled to implementation, mocks internals, breaks on refactor. The diagnostic: test breaks when you refactor, but behavior hasn't changed.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

Red flags: mocking internal collaborators, testing private methods, asserting on call counts, test name describes HOW not WHAT, verifying through external means instead of the interface.

For mocking guidelines, see [mocking.md](mocking.md).
For common testing anti-patterns, see [anti-patterns.md](anti-patterns.md).

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. "Un-automated-tested" is untested. No record, can't re-run, can't catch regressions. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is debt. |
| "Keep as reference" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = skip test" | Hard to test = hard to use. Listen to the test. Fix design. |
| "TDD will slow me down" | TDD faster than debugging. |
| "TDD is dogmatic, be pragmatic" | TDD IS pragmatic. "Pragmatic" shortcuts = debugging in production. |
| "This is different because..." | It's not. Follow the process. |
| "Tests will be better later" | Deferral. You'll understand the code less tomorrow. Write tests now while context is fresh. |
| "Rushed tests are worse than no tests" | False dichotomy. One focused test > zero tests. You don't need exhaustive coverage in 5 minutes. |
| "It's a P0 / hotfix / emergency" | Especially then. A failing test takes 60 seconds. It proves the fix works AND prevents regression. Hotfixes without tests cause the next P0. |

## Red Flags — STOP and Start Over

- Code written before test
- Test passes immediately (not testing new behavior)
- Can't explain why test failed
- "I already manually tested it"
- "It's un-automated-tested, not untested"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "This is different because..."
- "Tests will be better with fresh eyes"
- "It's a hotfix / emergency / P0"
- Rationalizing "just this once"
- Starting to write implementation when no test file exists yet

**All of these mean: Delete code. Start over with TDD.**

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask user. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

