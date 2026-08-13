# Rule: Security & Data Safety Standards

## Overview
This rule enforces strict security, data safety, and OWASP defense principles across all generated code automatically.

## Core Directives

### 1. Input Validation & Sanitization
- Validate and sanitize all external inputs (API request parameters, query strings, body payloads, user uploads, route params) at system boundaries.
- Use explicit schema validators (e.g. Zod, Joi) or strict type guards. Never trust external input.

### 2. Injection Prevention
- **Database**: Always use parameterized queries, ORM query builders, or prepared statements. Never concatenate raw strings into SQL/NoSQL queries.
- **XSS & Output Encoding**: Escape HTML dynamic values or use safe framework rendering mechanisms. Never expose raw `dangerouslySetInnerHTML` or `innerHTML` with untrusted data.
- **Command Injection**: Avoid executing dynamic shell strings. Use array syntax for sub-process arguments.

### 3. Authentication & Authorization
- Verify proper authentication and authorization checks before executing privileged operations, accessing resource endpoints, or mutating sensitive data.
- Enforce principle of least privilege in data queries and access control logic.

### 4. Zero Secrets Leakage
- Never hardcode secrets, passwords, API keys, tokens, private keys, or environment secrets in source files.
- Read configuration values strictly from environment variables (`process.env`).

### 5. Safe Error Handling & Logging
- Catch exceptions at appropriate boundaries. Never expose internal stack traces, database schema details, file system paths, or credential details to external clients.
- Sanitize error log outputs to prevent leaking PII (personally identifiable information) or secret headers.
