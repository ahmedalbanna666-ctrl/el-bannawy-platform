# Testing Strategy

Version: 2.0.0
Status: Current tools plus coverage gaps

## Available Tooling

- Backend: Jest and Nest testing utilities
- Web/shared: Vitest, Testing Library, jsdom, and coverage-v8
- Type safety: TypeScript compiler
- Static quality: ESLint and Prettier
- Database: Prisma migrations and seed workflow

Playwright, Supertest, Redis integration tests, and AI evaluation infrastructure are not currently configured as complete repository test suites.

## Test Layers

1. Unit tests for services, parsers, permission logic, question factories, and utilities.
2. Module/integration tests for Prisma-backed authentication, content import, permissions, coins, assessments, support, and live flows.
3. API tests for guards, DTO validation, response envelopes, status codes, and authorization.
4. Web component tests for learning players, imports, unlock UI, games, responsive states, RTL, and accessibility.
5. End-to-end smoke tests for login, curriculum, lesson completion, assessment, payment/unlock, and live booking once the harness is present.

## Priority Coverage

- Permission initialization/backfill and teacher-to-staff delegation
- Coin verification, wallet crediting, code redemption limits, and unlock atomicity
- Academic-context isolation and role-specific curriculum access
- DOCX preview/persistence and structured vocabulary semantics
- Assessment attempt limits, autosave, submission, scoring, and feedback
- Live booking uniqueness, status transitions, and attendance
- Support ticket ownership and staff/admin resolution permissions

## Required Local Gates

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @el-bannawy/backend test
pnpm --filter @el-bannawy/web test
```

Coverage percentages are targets, not current measurements. A release must report actual results and document exceptions.

End of Document.
