# When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email)
- Databases (prefer test DB when feasible)
- Time/randomness
- File system (sometimes)

**Don't mock:**
- Your own classes/modules
- Internal collaborators
- Anything you control

## Designing for Mockability

### 1. Dependency Injection

```typescript
// ✅ Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// ❌ Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

### 2. SDK-Style Interfaces Over Generic Fetchers

```typescript
// ✅ Each function independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
};

// ❌ Mocking requires conditional logic
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

Why SDK wins:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easy to see which endpoints a test exercises
- Type safety per endpoint

For common mocking anti-patterns, see [anti-patterns.md](anti-patterns.md).
