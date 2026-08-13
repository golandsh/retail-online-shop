# Workspace Rules

## Package Manager
- **Always use `pnpm`** instead of `npm`, `yarn`, or `npx` for all dependency installations, package scripts, build steps, and tests in this monorepo project.

## Core Behavioral Directives
- **Automated Testing**: Automatically create, update, and execute unit/integration tests (`pnpm test`) for all non-trivial code modifications.
- **Security & Data Safety**: Enforce strict input validation, parameterization, secret protection, and OWASP defenses.
- **Code Readability & Standards**: Maintain domain-expressive naming, strict TypeScript typing (no `any`), modular single-responsibility functions, and clean code principles.
