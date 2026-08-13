# Rule: Automated Testing

## Overview
This rule mandates that the agent automatically writes, updates, and executes automated tests for all code changes without requiring explicit user prompting.

## Core Directives

### 1. Automatic Test Creation
- Whenever writing or modifying non-trivial functions, business logic, endpoints, data transformations, or utility modules, **automatically create or update corresponding unit or integration tests**.
- Place test files alongside source code (e.g. `*.test.ts`, `*.spec.ts`) or in the project's designated test directories following existing repository conventions.

### 2. Comprehensive Test Coverage
Ensure every generated test suite covers:
- **Happy Path**: Expected inputs producing correct outputs.
- **Boundary & Edge Cases**: Empty arrays, zero values, long strings, edge numeric limits, unexpected types.
- **Negative & Error Paths**: Invalid inputs, rejected promises, thrown errors, network/database failures.
- **Null & Undefined**: Graceful handling of missing or partial data.

### 3. Empirical Verification
- **Run Tests Automatically**: Execute test suites using the project package manager (`pnpm test` or specific test runner command) before declaring a task completed.
- **Fix Failures Immediately**: If a test fails, analyze the root cause and fix the code or test logic. Never comment out broken tests or silence test failures.
