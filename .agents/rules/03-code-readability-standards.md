# Rule: Code Readability & Quality Standards

## Overview
This rule enforces clean code guidelines, high readability, domain-expressive naming, strict typing, and high maintainability across all generated code automatically.

## Core Directives

### 1. Domain-Expressive Naming & Intent
- Use clear, descriptive names for variables, functions, types, and files that reveal intent.
- Avoid vague single-letter variables (except standard loop indices `i`, `j`), cryptic acronyms, or misleading identifiers.
- Prefer verb-noun naming for functions (e.g. `calculateDiscountPrice`, `validateAdminToken`).

### 2. Modularity & Single Responsibility
- Keep functions small, focused, and dedicated to a single responsibility.
- Use early returns (guard clauses) to reduce nesting depth and flatten conditional logic.

### 3. Strict Type Safety
- Enforce strict typing. Avoid `any` or loose `unknown` casts unless strictly necessary and documented.
- Define clear interfaces, type aliases, and discriminating union types for complex domain models.
- Handle `null` and `undefined` explicitly with optional chaining (`?.`), nullish coalescing (`??`), or type guards.

### 4. DRY & Maintainability
- Avoid repeating logic blocks. Extract reusable helpers or domain utility methods.
- Maintain existing JSDoc comments and docstrings. Document non-obvious business logic, algorithms, or regulatory requirements.
