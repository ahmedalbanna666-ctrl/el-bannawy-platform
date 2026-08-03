# Documentation Guide

Version: 2.0.0

## How To Read This Repository

Start with:

1. `README.md`
2. `MASTER_EXECUTION_PLAN.md`
3. `00_PROJECT_OVERVIEW/PROJECT_REFERENCE.md`
4. `00_PROJECT_OVERVIEW/PROJECT_SCOPE.md`
5. `01_ARCHITECTURE/`
6. `02_DATABASE/`
7. `03_BACKEND/`
8. `04_SECURITY/`
9. `05_API/`
10. `06_UI/`
11. `07_AI/`
12. `08_DEVOPS/`
13. `09_TESTING/`
14. `10_DEPLOYMENT/`

## Status Convention

Every updated document should make its status clear:

- **Implemented**: backed by current code, schema, route, or test.
- **Baseline/Partial**: working foundation exists but parity or hardening is incomplete.
- **Planned**: target architecture or future feature; not a current runtime promise.
- **Audit**: historical or current finding list that must be verified against source.

The original documentation set was written before the implementation grew. Some older module specifications remain requirements documents and may describe planned behavior. When they conflict with a controller, Prisma schema, or current overview, do not use the old claim as implementation evidence.

## Documentation Change Rule

When a feature changes:

- update the relevant overview/business rule;
- update the backend module and API route document;
- update database documentation when schema changes;
- state limitations and test status;
- do not mark an integration complete because a Docker service or environment variable exists.

End of Document.
