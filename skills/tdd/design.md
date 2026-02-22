# Design for Testability

## Deep Modules

Small interface + deep implementation. Hide complexity behind simple APIs.

```
Deep (good):          Shallow (avoid):
┌──────────┐          ┌──────────────────┐
│ Small API│          │    Large API     │
├──────────┤          ├──────────────────┤
│          │          │ Thin impl        │
│ Deep impl│          └──────────────────┘
│          │
└──────────┘
```

Ask: Can I reduce methods? Simplify params? Hide more inside?

## Interface Design

1. **Accept dependencies, don't create them** — enables testing via DI
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

## Refactoring Candidates

After TDD cycle, look for:

- **Duplication** → extract function/class
- **Long methods** → break into private helpers (keep tests on public interface)
- **Shallow modules** → combine or deepen
- **Feature envy** → move logic to where data lives
- **Primitive obsession** → introduce value objects
- **Existing code** the new code reveals as problematic
