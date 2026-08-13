---
name: security-standards
description: >-
  Provides OWASP vulnerability mitigations, input sanitization patterns, safe authorization checks, and defense-in-depth security checklists.
---

# Security & Data Safety Skill Guide

Use this skill when auditing or writing security-sensitive code, input parsing, authentication handlers, database queries, or authorization middleware.

## OWASP Top 10 Reference & Mitigations

### 1. Broken Access Control
- **Mitigation**: Perform explicit RBAC (Role-Based Access Control) or ABAC checks on every backend endpoint. Never rely solely on UI visibility or client-side checks.
```typescript
if (!user.roles.includes('ADMIN') || user.tenantId !== resource.tenantId) {
  throw new ForbiddenError('Unauthorized access to tenant resource');
}
```

### 2. Cryptographic Failures & Secret Protection
- **Mitigation**: Store sensitive configuration in environment variables. Use bcrypt/Argon2 for passwords, SHA-256 with salt for hashing, and AES-256-GCM for encryption.
```typescript
// ALWAYS read from environment
const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error('JWT_SECRET environment variable is missing');
}
```

### 3. Injection Attacks (SQL / NoSQL / Command)
- **Mitigation**: Use ORM/query builder parameter bindings. Never interpolate raw user input into query strings.
```typescript
// SAFE: Parameterized ORM/SQL query
const admin = await prisma.admin.findUnique({
  where: { email: validatedInput.email }
});
```

### 4. Input Validation & Schema Parsing (Zod Example)
```typescript
import { z } from 'zod';

export const AdminCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

// Parse and validate before processing
const validatedData = AdminCreateSchema.parse(rawRequestBody);
```

## Security Audit Checklist
- [ ] Are all API inputs strictly validated against a schema before processing?
- [ ] Are SQL, HTML, or shell injections prevented via proper parameterization/escaping?
- [ ] Are authentication tokens validated on every protected route?
- [ ] Are stack traces and database errors hidden from production error responses?
- [ ] Are sensitive tokens/passwords excluded from log files?
