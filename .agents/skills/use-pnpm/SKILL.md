---
name: use-pnpm
description: Enforces using pnpm for all Node.js package management, dependency installation, script execution, builds, and test actions across the project workspace. Use whenever running npm, npx, node scripts, installing packages, or testing.
---

# Use PNPM Package Manager

This project uses `pnpm` and `pnpm-workspace.yaml` as its primary package manager across all monorepo packages.

## Instructions & Core Rules

1. **Package Management**:
   - ALWAYS use `pnpm` instead of `npm`, `yarn`, or `npx`.
   - **Install all dependencies**: `pnpm install`
   - **Add dependencies**: `pnpm add <package>` (or `pnpm add -D <package>` for dev dependencies)
   - **Add dependency to specific package**: `pnpm --filter <package-name> add <dep>`
   - **Remove dependencies**: `pnpm remove <package>`

2. **Script Execution & Commands**:
   - **Run package scripts**: `pnpm run <script>` or `pnpm <script>` (e.g., `pnpm test`, `pnpm build`, `pnpm dev`)
   - **Run script in specific workspace**: `pnpm --filter <workspace> <script>` (e.g., `pnpm --filter orders test`)
   - **Run CLI commands / binaries**: Use `pnpm exec <command>` or `pnpm dlx <package>` instead of `npx <package>`

3. **Shell Environment**:
   - Ensure `pnpm` is available in PATH when executing commands via `run_command`.
