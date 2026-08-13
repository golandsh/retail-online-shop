---
name: code-readability-standards
description: >-
  Provides clean code refactoring patterns, expressive naming guidelines, guard clauses, and TypeScript typing best practices.
---

# Code Readability & Quality Skill Guide

Use this skill when refactoring complex functions, improving code clarity, restructuring nested logic, or standardizing TypeScript type definitions.

## Clean Code Refactoring Patterns

### Pattern 1: Flatten Nesting with Guard Clauses
**Avoid Deep Nesting**:
```typescript
// ❌ BAD: Deeply nested conditionals
function processOrder(order?: Order) {
  if (order) {
    if (order.status === 'PENDING') {
      if (order.items.length > 0) {
        // Core logic here...
      }
    }
  }
}
```

**Prefer Guard Clauses**:
```typescript
// ✅ GOOD: Flattened with early returns
function processOrder(order?: Order) {
  if (!order) return;
  if (order.status !== 'PENDING') return;
  if (order.items.length === 0) return;

  // Core logic here...
}
```

### Pattern 2: Domain-Expressive Naming
- Functions should describe actions: `fetchActiveAdmins()`, `verifyPasswordHash()`, `formatCurrencyAmount()`.
- Booleans should sound like assertions: `isLoggedIn`, `hasPermission`, `canModifyResource`, `shouldRetry`.

### Pattern 3: Strict & Discriminating Unions (TypeScript)
```typescript
// ✅ GOOD: Discriminating union for UI / API state
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

## Readability Checklist
- [ ] Is every function small and doing only one thing?
- [ ] Are variable and function names self-describing without needing comments to explain what they hold?
- [ ] Are magic numbers or strings replaced with named constants or enums?
- [ ] Are deep nested `if/else` statements flattened using guard clauses?
- [ ] Is TypeScript strict mode respected without fallback to `any`?
