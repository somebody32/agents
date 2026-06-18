---
name: placing-code-in-layers
description: Use when deciding which layer a piece of code belongs in (domain, application, or infrastructure), when business rules are mixed with framework/UI/database/HTTP code, when an external SDK or API response shape is leaking into core logic, when a test forces you to mock your own classes or sibling collaborators, or when unsure whether to introduce an interface/port/abstraction.
---

# Placing Code in Layers

## Overview

**Core principle:** Code is sorted by distance from the business domain, and dependencies only ever point *inward*. **Where a piece of code lives decides how it is tested and what — if anything — you mock.**

This is the structural half of testing discipline. `tdd` tells you *when* to mock (only at the system boundary); this skill tells you *where that boundary is* and which layer any given line belongs to. Not frontend-specific — the layers and the dependency rule apply to any app.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
DEPENDENCIES POINT INWARD. THE DOMAIN DEPENDS ON NOTHING.
```

- **Domain** depends on nothing (only the language + your own pure helpers).
- **Application** depends only on the domain, plus the ports it defines.
- **Adapters / infrastructure** may depend on anything.

If you are bending core logic to fit an external API, SDK, or framework, **the arrow is backwards. Stop and invert it** — define what *your app* wants, make the outside world adapt.

## The Three Layers

| Layer | Holds | May depend on | Touches framework / IO? | In tests |
|---|---|---|---|---|
| **Domain** (center) | Entities, value objects, pure business rules & data transforms | Nothing | **Never** | Real values, **zero mocks** |
| **Application** (use cases) | Orchestration of one scenario; defines **ports** (interfaces) | Domain only | No — only through ports | Real domain; fake only the ports |
| **Adapters / infrastructure** (edge) | UI, HTTP client, DB/storage, clock, vendor SDKs | Anything | Yes | The only place you mock — and only the *unmanaged* edges (see `tdd`) |

The more "service-like" or vendor-specific the code feels, the farther from the center it belongs.

## Where Does This Code Go?

Ask in order — first yes wins:

1. **Is it a rule or data transformation that stays true regardless of framework, storage, or transport?** → **Domain.** Write it as a pure function: no `fetch`, no `Date.now()`, no `localStorage`, no React, no SDK types.
2. **Does it sequence a user scenario — get data, transform it, persist/notify?** → **Application use case.** It calls the domain and talks to the world only through ports.
3. **Does it actually speak to the outside world — render UI, hit the network, read storage, read the clock, call a vendor SDK?** → **Adapter.**

**Tie-breaker:** "Would this survive swapping React→Vue, REST→GraphQL, Stripe→Adyen unchanged?" Survives → domain. Dies → adapter.

## Pure Core, Impure Shell

The technique that makes the domain trivially testable: **side-effect in → pure transform → side-effect out.** Keep all IO in a thin shell; keep all decisions in the pure core.

```ts
// application/orderProducts.ts — impure shell (a use case)
async function orderProducts(user: User, cart: Cart, deps: Deps) {
  const { payment, orders, notifier, clock } = deps; // ports, injected at the edge

  // 1. side-effects IN: gather what the pure core needs
  const created = clock.now();

  // 2. PURE CORE: the business decision — no IO, trivially testable
  const order = createOrder(user, cart, created); // domain fn

  // 3. side-effects OUT
  const paid = await payment.tryPay(order.total);
  if (!paid) return notifier.notify("Payment failed");
  orders.save(order);
}
```

`createOrder` is pure → tested with plain values, **no mocks**. The shell is thin and tested through behavior with the ports faked. Note the clock is *injected*, not read inline — time is an unmanaged edge (`tdd`: "clock/randomness/UUID → mock these").

## Ports: The App Defines What It Wants

A **port** is an interface your application defines for what *it* needs — not a wrapper around what a vendor offers. The interface lives in the application layer; the implementation (adapter) lives outside and depends inward.

```ts
// application/ports.ts — the app's wish
export interface PaymentService { tryPay(amount: PriceCents): Promise<boolean>; }

// adapters/stripePayment.ts — reality bends to the wish
export const stripePayment: PaymentService = { tryPay: (amt) => stripe.charge(/* ... */) };
```

Swap Stripe for Adyen → only the adapter changes; the use case and domain never move. **This interface is also the seam where tests inject a fake.**

## Responsibilities → Mocking (Diagnosis)

"I have to mock everything to test this" is not a testing problem — it is a **placement** problem. Two cures:

- **Pure rule stranded in an adapter** (component/hook/controller)? → move it to the domain; test it with plain values, no mocks.
- **Use case reaching into a concrete vendor**? → define a port; fake the port, not the vendor.

After that, if you still mock exactly one thing — the unmanaged external edge — you have placed the code correctly. This is the structural fix for `tdd`'s "Must mock everything → code too coupled."

## The Pragmatic Floor (Anti Over-Engineering)

Full layering has real costs: more code, slower onboarding, bigger bundles. Scale it:

- **Always:** extract the domain (pure rules in one place) + obey the dependency rule (arrows inward).
- **Only when earned:** ports + adapters — when there is a real boundary: a second implementation, an unmanaged dependency, or a test seam you actually need.

Do **not** add an interface with one implementation and no test reason. That is ceremony, not architecture.

## What Goes Wrong

| Situation | Do |
|---|---|
| A "special kind of" entity (discounted product, write-off product) | **Don't inherit/extend.** Copy-paste the variant, watch how it actually differs, merge later if it does. Premature hierarchy is harder to undo than duplication. |
| One use case triggers another | Break both into smaller atomic use cases and compose them. |
| `price: number` (or dates as bare strings) everywhere | Primitive obsession. Use a value object (`{ value, currency }`) or branded type. Pairs with `tdd`'s value-object refactor. |

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Small app — I'll call the API straight from the component" | Fine for a throwaway spike. The moment you write a test you'll mock the API to test a *rule*. Extract the rule to the domain first. |
| "The SDK type is convenient, I'll use it in my domain" | Now your domain depends on the vendor; their breaking change is your breaking change. Map to your own type at the adapter. |
| "I'll add a port for everything to keep it clean" | Over-engineering. Ports earn their place at real boundaries — see the Pragmatic Floor. |
| "The hook/controller is a fine place for this calculation" | That's an adapter. Pure logic there can't be tested without rendering. Move it to the domain. |
| "It's clearly a hierarchy, I'll use `extends`" | You haven't seen it vary yet. Duplicate until the shape is proven. |
| "I'll just read `Date.now()` inside the domain function" | That's a side-effect → not deterministic → not pure. Inject the clock; pass the value in. |

## Red Flags — STOP

- A domain file imports `axios`/`fetch`/React/a DB client/`Date.now()`/an SDK directly
- You're editing core logic so it matches an API response shape (arrow backwards)
- A unit test mocks a class **you own** or a sibling collaborator to test a rule or arithmetic
- You reach for inheritance to model a "special kind of" entity before you've seen it vary
- You're adding an interface with exactly one implementation and no test/second-impl reason
- The discount/total/eligibility math lives in the click handler, hook, or controller

**All of these mean: re-place the code. Push the rule inward, or define a port — then the test writes itself.**

## Relationship to Other Skills

- **`tdd`** — Two halves of one boundary. This skill says *where* the boundary is (the adapters/ports layer); `tdd` says *when* to mock it (only there) and *how* to write the test. Mapping: domain = "never mock, pure functions"; ports = the DI seam ("inject the boundary, not every collaborator"); driven adapters = "mock these (external edge)". **Caveat:** `tdd` splits adapters into *managed* (your own DB → use a real test instance, don't mock) vs *unmanaged* (payment/SMTP/3rd-party → mock). Carry that split — an adapter is not automatically a mock target.
- **`surgical-edits`** — Placing one function in the right layer is not a license to re-layer the whole file. Move what you were asked to move; **flag** the rest as a finding.
- **`shaping`** — Layer assignment is a design decision. Settle it during shaping (which logic is domain? what ports exist?), not improvised mid-implementation.

## The Bottom Line

Sort code by distance from the domain; point every dependency inward. Get the placement right and the test — and the answer to "do I mock this?" — falls out for free.
