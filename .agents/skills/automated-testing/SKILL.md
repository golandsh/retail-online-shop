---
name: automated-testing
description: >-
  Provides comprehensive guidelines, AAA test structure patterns, mocking strategies, and edge-case checklists for writing robust unit and integration tests.
---

# Automated Testing Skill & Reference Guide

Use this skill when designing or expanding unit/integration test suites, setting up mocks, or troubleshooting test execution failures.

## Test Structure Pattern (AAA: Arrange-Act-Assert)

Every test should follow the standard **Arrange-Act-Assert** pattern for maximum readability:

```typescript
describe('AdminsService', () => {
  it('should validate and update admin profile details successfully', async () => {
    // 1. Arrange: Set up initial state, test data, and mocks
    const mockAdminId = 'admin-123';
    const updatePayload = { name: 'Jane Doe', email: 'jane@example.com' };
    const mockUpdatedAdmin = { id: mockAdminId, ...updatePayload };
    
    vi.spyOn(apiClient, 'put').mockResolvedValue({ data: mockUpdatedAdmin });

    // 2. Act: Call the target method
    const result = await updateAdminProfile(mockAdminId, updatePayload);

    // 3. Assert: Verify expectations
    expect(result).toEqual(mockUpdatedAdmin);
    expect(apiClient.put).toHaveBeenCalledWith(`/admins/${mockAdminId}`, updatePayload);
  });
});
```

## Mocking & Isolation Strategy

1. **Mock External IO Boundaries**: Always mock network requests, HTTP clients, external third-party SDKs, and database connections in unit tests.
2. **Keep Tests Deterministic**: Avoid `Math.random()`, real timestamps without mock timers, or live network calls in unit tests.
3. **Clean Up State**: Use `afterEach(() => { vi.clearAllMocks(); })` or `jest.clearAllMocks()` to ensure test isolation.

## Edge Case Checklist

Before concluding test coverage, check if you have tested:
- [ ] Empty arrays `[]`, empty strings `""`, zero `0`, and negative values.
- [ ] `null` and `undefined` properties in request bodies or configuration parameters.
- [ ] Network timeout and 4xx/5xx HTTP error responses.
- [ ] Concurrent requests or asynchronous race conditions.
- [ ] Malformed JSON responses or schema mismatch payloads.
