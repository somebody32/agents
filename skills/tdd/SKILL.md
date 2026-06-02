---
name: tdd
description: Use when implementing features, fixing bugs (including P0 hotfixes and production incidents), or refactoring. Use when user mentions TDD, red-green-refactor, test-first, or when tempted to write code before tests. Use when fixing any bug — even trivial ones. Use when encountering or modifying existing code that lacks tests. Use when writing tests, deciding what to mock, or when tests are full of mocks, coupled to implementation, or break on every refactor.
---

# Test-Driven Development

## Overview

**Core principle:** Tests verify behavior through public interfaces, not implementation details. If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

This is the complete TDD reference — workflow, mocking boundaries, anti-patterns, and design for testability are all here. Read the whole file; nothing important is in a separate file you can skip.

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
- Design interfaces for testability (see [Design for Testability](#design-for-testability))
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

One minimal test. One behavior. Clear name. Wire **real collaborators** together; mock only true external boundaries (see [Mock Only at the System Boundary](#mock-only-at-the-system-boundary)).

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

**Stay surgical.** Don't touch adjacent code, comments, or formatting while implementing. Drive-by changes during GREEN make the diff unreviewable and the bug surface ambiguous. See `surgical-edits` for the full rule and rationalization table.

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
- Deepen modules (see [Design for Testability](#design-for-testability))
- Apply SOLID where natural
- Run tests after each refactor step

**Refactor stays scoped to what you just implemented.** Don't refactor unrelated parts of the file because you're "already in there." See `surgical-edits`.

### 6. Repeat

Next failing test for next behavior.

## Per-Cycle Checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Uses real collaborators; mocks only true external boundaries
[ ] Watched test fail before implementing
[ ] Failure was for expected reason
[ ] Code is minimal for this test
[ ] All tests pass
[ ] No speculative features added
```

## Mock Only at the System Boundary

**Default: use real code.** A good test wires your *real* objects together and exercises them through the public interface. Mocks are a rare exception reserved for the true edge of your system — they are NOT a tool for "isolating a unit" from its own neighbors.

**The boundary gate — before mocking ANY dependency, ask in order:**

1. **Do I own this code?** If yes → **don't mock it. Use the real thing.**
2. **Does it run in-process and deterministically?** If yes → **don't mock it.**
3. Mock ONLY when all are true: I don't fully control it, it crosses a process/network boundary, AND its behavior is observable by the outside world.

| Mock these (real external boundary) | Never mock these (inside your boundary) |
|---|---|
| Third-party APIs you don't own (payment, email) | Your own classes, services, modules |
| Message buses / queues other systems observe | Sibling collaborators (validators, mappers, calculators) |
| Clock, randomness, UUID generation | Domain logic and pure functions |
| Outbound notifications (SMTP, webhooks) | Your own application database\* |

\* **Your own database is not a boundary to mock** — prefer a real test DB (in-memory or containerized). It's an implementation detail behind code you own; mocking it couples tests to *how* you persist, not *what* the system does.

**The #1 mistake: mocking within your own boundary.** Mocking a collaborator that lives in the same module/service as the code under test produces a test that verifies your mocks, not your system — it breaks on every refactor while catching no real bugs. Wire the real collaborators together; mock only the edge.

```typescript
// ❌ Over-mocked: every collaborator is your own in-process code
test("checkout totals the cart", () => {
  const calc = { total: vi.fn().mockReturnValue(42) };
  const validator = { validate: vi.fn().mockReturnValue(true) };
  const result = checkout(cart, calc, validator, fakePaymentGateway);
  expect(result.total).toBe(42); // asserts the mock's return value, not real logic
});

// ✅ Real collaborators; mock ONLY the external gateway
test("checkout totals the cart", () => {
  const result = checkout(
    cart,
    new PriceCalculator(),
    new CartValidator(),
    fakePaymentGateway,
  );
  expect(result.total).toBe(cart.items.reduce((s, i) => s + i.price, 0));
});
```

### Why this boundary (the deeper rule)

- **Sociable over solitary tests.** Let objects collaborate with their real neighbors. A bug in a collaborator *should* fail the tests that depend on it — that's coverage, not a flaw.
- **Managed vs unmanaged dependencies** (Khorikov). *Managed* = out-of-process but reachable only through your app (your DB) → use the real thing. *Unmanaged* = observable by other systems (SMTP, message bus, third-party API) → mock, to pin the observable contract. Mocking managed dependencies yields brittle tests.
- **Don't mock what you don't own.** For third-party libraries, wrap them in a thin adapter *you* own, then fake/mock the adapter — never the foreign type directly. You can't guarantee a hand-written mock matches the real library's behavior.

### Designing for the boundary

**Inject the boundary, not every collaborator.** Dependency injection exists for the true edge (the payment client, the clock) — it is not an excuse to parameterize and mock your own internals.

```typescript
// ✅ Inject the external boundary → easy to fake
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// ❌ Hard-codes the boundary → forces over-mocking elsewhere
function processPayment(order) {
  return new StripeClient(process.env.STRIPE_KEY).charge(order.total);
}
```

**Prefer SDK-style interfaces over a generic fetcher** at the boundary — each endpoint fakes to one specific shape, with no conditional logic in test setup:

```typescript
// ✅ Each call independently fakeable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
};

// ❌ One fetch(endpoint, options) → mock must branch on the endpoint
const api = { fetch: (endpoint, options) => fetch(endpoint, options) };
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
// BAD: Tests implementation details / mocks an internal collaborator
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

## Testing Anti-Patterns

**Core principle:** Test what the code does, not what the mocks do.

### 1. Testing Mock Behavior

```typescript
// ❌ Asserting that the mock exists
expect(screen.getByTestId("sidebar-mock")).toBeInTheDocument();
// ✅ Assert real component behavior
expect(screen.getByRole("navigation")).toBeInTheDocument();
```

**Gate:** "Am I testing real behavior or mock existence?" If mock existence → delete assertion or unmock.

### 2. Test-Only Methods in Production

```typescript
// ❌ destroy() only used in tests
class Session { async destroy() { /* cleanup */ } }
// ✅ Put cleanup in test utilities, not production code
export async function cleanupSession(session: Session) { /* cleanup */ }
```

**Gate:** "Is this method only used by tests?" If yes → move to test utilities.

### 3. Mocking Without Understanding

```typescript
// ❌ Mock removes a side effect the test depends on
vi.mock("ToolCatalog", () => ({ discoverAndCacheTools: vi.fn().mockResolvedValue(undefined) }));
// ✅ Mock lower — preserve the behavior the test needs
vi.mock("MCPServerManager"); // just mock slow server startup
```

**Gate before mocking:** (1) What side effects does the real method have? (2) Does this test depend on any of them? (3) If yes → mock lower, preserve needed behavior. **Red flags:** "I'll mock this to be safe" / "Might be slow, better mock it."

### 4. Incomplete Mocks

Mock the COMPLETE data structure, not just the fields your test reads. Partial mocks hide structural assumptions and fail silently downstream. **Gate:** "Does my mock match the real API schema completely?"

### 5. Over-Complex Mocks

**Warning signs:** mock setup longer than test logic; mocking everything to make the test pass; test breaks whenever the mock changes. **Fix:** use real components / integration-style tests — usually simpler than the mocks they replace.

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand deps first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Over-complex mocks | Use real collaborators / integration tests |

## Design for Testability

### Deep Modules

Small interface + deep implementation. Hide complexity behind simple APIs. Ask: Can I reduce methods? Simplify params? Hide more inside?

### Interface Design

1. **Accept dependencies, don't create them** — enables testing via DI (at the boundary)
2. **Return results, don't produce side effects** — enables assertion
3. **Small surface area** — fewer methods = fewer tests = simpler setup

```typescript
// ✅ Testable: accepts dep, returns result
function calculateDiscount(cart, pricingService): Discount {}

// ❌ Hard to test: creates dep, produces side effect
function applyDiscount(cart): void {
  const pricing = new PricingService();
  cart.total -= pricing.getDiscount(cart);
}
```

### Refactoring Candidates

After a TDD cycle, look for: **duplication** → extract; **long methods** → private helpers (keep tests on the public interface); **shallow modules** → combine/deepen; **feature envy** → move logic to where the data lives; **primitive obsession** → introduce value objects; **existing code** the new code reveals as problematic.

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
| "I'll mock the collaborator to isolate the unit" | That collaborator is your own code. Use it for real. Mock only the external edge. |
| "Mocking my own class makes the test faster/simpler" | It makes the test verify mocks, not behavior. In-process + deterministic → use the real thing. |
| "I'll mock the database to keep it a unit test" | Your DB is a managed dependency. Use a real test DB. Mocking it tests persistence wiring, not behavior. |
| "TDD will slow me down" | TDD faster than debugging. |
| "TDD is dogmatic, be pragmatic" | TDD IS pragmatic. "Pragmatic" shortcuts = debugging in production. |
| "This is different because..." | It's not. Follow the process. |
| "Tests will be better later" | Deferral. You'll understand the code less tomorrow. Write tests now while context is fresh. |
| "Rushed tests are worse than no tests" | False dichotomy. One focused test > zero tests. |
| "It's a P0 / hotfix / emergency" | Especially then. A failing test takes 60 seconds. Hotfixes without tests cause the next P0. |

## Red Flags — STOP and Start Over

- Code written before test
- Test passes immediately (not testing new behavior)
- Can't explain why test failed
- Mocking a class/module you own or that runs in-process
- Mocking a sibling collaborator inside the same module/service
- Mocking your own application database
- Asserting on call counts / `toHaveBeenCalledWith` instead of observable results
- Mock setup longer than the test logic
- "I already manually tested it"
- "It's un-automated-tested, not untested"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "This is different because..."
- "It's a hotfix / emergency / P0"
- Starting to write implementation when no test file exists yet

**All of these mean: Delete code (or the mock). Start over correctly.**

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask user. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled, OR you're mocking your own internals. Mock only the boundary; use real collaborators. Use DI for the edge. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |
