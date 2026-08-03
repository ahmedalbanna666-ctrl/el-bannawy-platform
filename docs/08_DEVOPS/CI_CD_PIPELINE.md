# CI/CD Pipeline

Version: 2.0.0
Status: Repository commands documented; hosted pipeline remains deployment-specific

## Required Checks

1. Install with the locked pnpm dependency graph.
2. Run ESLint.
3. Run TypeScript checks.
4. Run backend/web/shared tests relevant to the change.
5. Build all applications.
6. Validate Prisma schema/migrations.
7. Build Docker images for release candidates.
8. Run security/dependency scans supplied by the hosting environment.

## Local Equivalent

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @el-bannawy/backend test
pnpm --filter @el-bannawy/web test
```

## Current Repository Reality

The repository has Dockerfiles and GitHub metadata, but the documentation must not claim an active staging-to-production CD pipeline, automatic rollback, Slack notifications, or traffic switching until a workflow and deployment target prove them.

## Release Gate

No release may be marked production-ready while required secrets, migrations, authentication, payment verification, and security findings are unverified.

End of Document.
