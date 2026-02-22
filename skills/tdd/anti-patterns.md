# Testing Anti-Patterns

**Load when:** writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

**Core principle:** Test what the code does, not what the mocks do.

## Anti-Pattern 1: Testing Mock Behavior

```typescript
// ❌ Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// ✅ Test real component behavior
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

**Gate:** "Am I testing real behavior or mock existence?" If mock existence → delete assertion or unmock.

## Anti-Pattern 2: Test-Only Methods in Production

```typescript
// ❌ destroy() only used in tests
class Session {
  async destroy() { /* cleanup */ }
}

// ✅ Test utilities handle cleanup
// In test-utils/
export async function cleanupSession(session: Session) { /* cleanup */ }
```

**Gate:** "Is this method only used by tests?" If yes → put in test utilities, not production code.

## Anti-Pattern 3: Mocking Without Understanding

```typescript
// ❌ Mock prevents side effect test depends on
vi.mock('ToolCatalog', () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
}));
// Config write was needed! Test now broken.

// ✅ Mock at correct level — preserve behavior test needs
vi.mock('MCPServerManager'); // Just mock slow server startup
```

**Gate before mocking:**
1. What side effects does the real method have?
2. Does this test depend on any of those?
3. If yes → mock lower, preserve needed behavior

**Red flags:** "I'll mock this to be safe" / "Might be slow, better mock it"

## Anti-Pattern 4: Incomplete Mocks

Mock the COMPLETE data structure, not just fields your test uses. Partial mocks hide structural assumptions and fail silently downstream.

**Gate:** "Does my mock match the real API response schema completely?" If unsure → include all documented fields.

## Anti-Pattern 5: Over-Complex Mocks

**Warning signs:**
- Mock setup longer than test logic
- Mocking everything to make test pass
- Test breaks when mock changes

**Fix:** Consider integration tests with real components. Often simpler than complex mocks.

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand deps first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Over-complex mocks | Consider integration tests |
