# Automated Testing

Version: 2.0.0

## Repository Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @el-bannawy/backend test
pnpm --filter @el-bannawy/backend test:e2e
pnpm --filter @el-bannawy/web test
pnpm --filter @el-bannawy/web test:coverage
pnpm --filter @el-bannawy/mobile typecheck
```

The e2e command exists in the backend package, but its environment/database requirements must be available before it can be considered a passing release gate.

## Current Automated Coverage

Focused tests exist for authentication, delegated permission initialization, DOCX vocabulary parsing/persistence, shared utilities, and selected backend services. The repository does not yet provide complete automated coverage for every module listed in the original strategy.

## Release Gate

Run lint, typecheck, build, relevant unit tests, migration validation, and manual smoke tests for changed critical flows. Add or update a regression test for every fixed business or security bug.

## Not Yet A Passing Claim

Do not claim that Redis, queues, Playwright, Supertest, AI evaluation, accessibility automation, or production smoke tests are active merely because they appear in an older document.

End of Document.
