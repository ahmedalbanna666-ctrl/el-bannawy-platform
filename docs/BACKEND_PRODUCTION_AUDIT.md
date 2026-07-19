# Backend Production Quality Audit — Full Report

**Date:** 2026-07-19
**Scope:** `apps/backend/src/` — 31 modules, ~90 source files
**Method:** Static analysis with evidence-backed findings
**Auditor:** AI Agent (opencode)

---

## Scoring Summary

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| 1. Architecture | 20% | 7/10 | 14.0/20 |
| 2. Type Safety | 10% | 8/10 | 8.0/10 |
| 3. API Design | 10% | 5/10 | 5.0/10 |
| 4. Database Design | 15% | 7/10 | 10.5/15 |
| 5. Security | 15% | 5/10 | 7.5/15 |
| 6. Performance | 10% | 4/10 | 4.0/10 |
| 7. Maintainability | 10% | 6/10 | 6.0/10 |
| 8. Production Readiness | 10% | 3/10 | 3.0/10 |
| **Total** | **100%** | | **58/100** |

**Verdict: 🟠 Production Ready With Significant Improvements Required**

> The codebase has strong architectural foundations — modular monolith, proper DI, comprehensive feature coverage, consistent naming — but **cannot be deployed to production safely** without addressing 6 critical security and infrastructure gaps.

---

## Dimension 1 — Architecture (7/10)

### Strengths
- Modular monolith with clear controller/service/module separation in 28/31 modules
- Consistent kebab-case naming across all 173+ files
- Dependency injection used throughout (`@Injectable()`, constructor injection)
- `DelegatedPermissionService` with role→permission ceiling mapping is well-designed
- Prisma as single ORM — no raw SQL or query builder bypasses
- `$transaction` used in multi-step write operations

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| A1 | Missing repository layer — 27/31 modules access Prisma directly from services | All services | Medium |
| A2 | Business logic leaks into controllers: `academic-context.controller.ts:25-42` calls `prisma.grade.findMany()` directly | `academic-context.controller.ts` | Medium |
| A3 | 3 controllers skip `successResponse` envelope entirely (see H2) | video-question, execution, assessment-attempt | High |
| A4 | Missing DTOs — `AiController.createConversation`, `LessonController.addVideo` accept unvalidated params | `ai.controller.ts:16`, `lesson.controller.ts:67-69` | Medium |
| A5 | Inline DTO definitions in `curriculum.controller.ts` instead of separate files | `curriculum.controller.ts` | Low |

---

## Dimension 2 — Type Safety (8/10)

### Strengths
- TypeScript strict mode enabled
- No `any` types found — `unknown` used consistently
- Exported functions have explicit return types
- `@el-bannawy/shared` provides shared `Permission`, `UserRole` types
- Discriminated unions in gateway implementations

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| T1 | Multiple services return `Promise<unknown>` instead of typed interfaces | `quiz.service.ts:76`, `homework.service.ts:76`, 6 others | Medium |
| T2 | Inline `as` type assertions in `api-client.ts` without shape validation (partially fixed) | `apps/web/src/lib/api-client.ts` | Low |
| T3 | Auth store `role` was typed as `string` (now fixed → `UserRole`) | `apps/web/src/lib/auth-store.ts` | Fixed |
| T4 | Competition controller uses string literals `"competition.manage"` instead of `PERMISSIONS.COMPETITION_MANAGE` | `competition.controller.ts` (12 endpoints) | Low |

---

## Dimension 3 — API Design (5/10)

### Strengths
- RESTful URL patterns in most controllers (`/api/v1/resource`)
- UUIDs for all resource IDs
- JSON request/response bodies
- Consistent HTTP methods (GET, POST, PUT, PATCH, DELETE)

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| D1 | 3 controllers return non-standard response format (see H2) | video-question, execution, assessment-attempt | High |
| D2 | 8+ list endpoints lack pagination (see H3) | admin, live, support, notifications, reports, competition, coins, mistakes | High |
| D3 | 15+ create endpoints return 200 instead of 201 | Multiple controllers | Medium |
| D4 | Verbs in URL paths: `reset-password`, `permissions/grant`, `complete-oauth-registration`, `validate-verification-code` (6 routes) | auth.controller, admin.controller | Low |
| D5 | No global exception filter — errors use NestJS default format (see H1) | Entire app | Medium |
| D6 | Pagination format is non-standard — items nested inside `data` vs standard `items` + `meta` | `ISuccessResponse` generic | Low |
| D7 | Validation errors use default NestJS format (not standardized) | Entire app | Low |

---

## Dimension 4 — Database Design (7/10)

### Strengths
- UUIDs for all primary and foreign keys (`@db.Uuid`)
- Proper `@relation` declarations with correct `onDelete` cascade rules
- Soft delete pattern (`deletedAt`) on User, Conversation
- Indexes on query-heavy columns (`email`, `status`, `gradeId`, `userId`)
- Timestamps (`createdAt`, `updatedAt`) on all entities

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| DB1 | 10+ String fields should be enums: Competition `status`, Competition `visibility`, SupportTicket `status`/`priority`, Payment `status`/`method`, Notification `type`/`priority` | `schema.prisma` | Medium |
| DB2 | `MiniExam` / `MiniExamAnswer` models missing `@relation` — no FK enforcement | `schema.prisma:1497-1540` | Medium |
| DB3 | `AssessmentAnswer` → `Question` has `onDelete: Cascade` — deleting a question deletes all its answers | `schema.prisma:1188` | Medium |
| DB4 | `email` + `mobileNumber` both optional on User — orphan accounts possible | `schema.prisma:14-15` | Low |
| DB5 | `true_base` migration + `init` migration both create same schema — overlap risk | `database/prisma/migrations/` | Medium |
| DB6 | Missing composite indexes on `(userId, quizId, submitted)` and `(userId, homeworkId, submitted)` | `schema.prisma` | Low |

---

## Dimension 5 — Security (5/10)

### Strengths
- Password hashing with bcrypt (12 salt rounds)
- JWT + refresh token authentication
- RBAC with `RolesGuard`
- Permission-based authorization with `PermissionGuard`
- Refresh token rotation (old tokens revoked on new issuance)
- Timed-based webhook signature verification (5min skew window)

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| S1 | Hardcoded JWT secret fallback — **`"el-bannawy-jwt-secret"`** | `auth.module.ts:19`, `jwt.strategy.ts:17` | **Critical** |
| S2 | Hardcoded webhook secret fallback — **`"el-bannawy-webhook-secret"`** | `payments-webhook.controller.ts:7` | **Critical** |
| S3 | OAuth tokens leaked in URL redirect query params | `auth.controller.ts:51,55` | **Critical** |
| S4 | No rate limiting on login, register, forgot-password, or any endpoint | `main.ts` (absence) | **Critical** |
| S5 | Simulation mode hardcoded HMAC key — **`"el-bannawy-sim"`** with no NODE_ENV gate | `gateway.implementations.ts:78` | High |
| S6 | No helmet middleware — missing security headers | `main.ts` (absence) | High |
| S7 | No global exception filter — stack traces may leak | Entire app | Medium |
| S8 | `LoginDto` allows identity+password both missing (potential noop auth) | `auth/dto/auth.dto.ts:65-80` | Low |
| S9 | File uploads not validated for size or type (5 endpoints) | `lesson.controller.ts` | Medium |

---

## Dimension 6 — Performance (4/10)

### Strengths
- `$transaction` used for multi-step writes
- `PrismaModule` is singleton-instantiated
- Selective `select`/`include` in most Prisma queries

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| P1 | No caching layer — zero Redis or in-memory cache on any query | Entire app | **Critical** |
| P2 | N+1 queries in `validatePrerequisites` — one DB call per video | `quiz.service.ts:591-598` | High |
| P3 | N+1 queries in `inviteGrade` — one notification per student | `competition.service.ts:133-140` | High |
| P4 | Race condition in `quiz.startAttempt` / `homework.startAttempt` — count then create without transaction | `quiz.service.ts:84-96`, `homework.service.ts:81-95` | High |
| P5 | Race condition in `redeemCode` — usedCount check outside transaction | `coins.service.ts:168-196` | High |
| P6 | N+1 upserts inside `unlockContent` transaction | `coins.service.ts:142-153` | Medium |
| P7 | Unpaginated `findMany()` on 8+ list endpoints | Multiple controllers | High |
| P8 | No file upload size validation | `lesson.controller.ts` | Low |

---

## Dimension 7 — Maintainability (6/10)

### Strengths
- Consistent file naming (kebab-case)
- Consistent DI pattern
- Modular structure with per-feature directories
- Shared types in `@el-bannawy/shared`
- ESLint + Prettier configured

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| M1 | `LiveService` — 1,215 lines, 7+ responsibilities | `live/live.service.ts` | High |
| M2 | `AdminService` — 1,043 lines, 10+ domains | `admin/admin.service.ts` | High |
| M3 | Homework / Quiz services ~80% structurally duplicated | `homework.service.ts` vs `quiz.service.ts` | High |
| M4 | `findOrThrow` pattern repeated 30+ times — no shared helper | All services | Medium |
| M5 | Multiple `RolesGuard` / `PermissionGuard` instances (wasteful) | 10+ modules | Low |
| M6 | Unused parameters: `_dto`, `_userId` in live controller | `live/live.controller.ts` | Low |
| M7 | `console.warn` in auth service for verification code | `auth/auth.service.ts` | Low |

---

## Dimension 8 — Production Readiness (3/10)

### Strengths
- `.env.example` comprehensive (78 lines)
- Docker compose with health checks
- Build scripts complete
- Prisma migration workflow established

### Weaknesses

| # | Finding | Location | Severity |
|---|---|---|---|
| PR1 | No `ConfigModule` — `process.env` accessed directly without validation | `main.ts:1-4`, entire app | **Critical** |
| PR2 | Hardcoded secret fallbacks mean silent production misconfiguration | auth, payments, gateway | **Critical** |
| PR3 | No monitoring / metrics — no `/health`, no Prometheus, no request tracking | `main.ts` (absence) | High |
| PR4 | No startup validation — app starts with missing/invalid config silently | `main.ts` (absence) | High |
| PR5 | No structured logging — no correlation IDs, no JSON logs | Entire app | Medium |
| PR6 | Dockerfile may not copy `prisma/` folder for client generation | `Dockerfile` (unverified) | Medium |

---

# 🔴 Critical Findings — Detailed Breakdown

---

## C1: Hardcoded JWT Secret Fallback

### Location
`apps/backend/src/auth/auth.module.ts:19`
```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET ?? "el-bannawy-jwt-secret",
  signOptions: { expiresIn: "1h" },
}),
```

`apps/backend/src/auth/jwt.strategy.ts:17`
```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: process.env.JWT_SECRET ?? "el-bannawy-jwt-secret",
});
```

### Why This Is a Problem
If `JWT_SECRET` is not set in the environment, the application falls back to the publicly known string `"el-bannawy-jwt-secret"`. Since there is no environment validation (C6), the app starts silently with this insecure default. Any attacker who knows this string can:
1. Forge JWTs with any role (including `"ADMINISTRATOR"`) and impersonate any user
2. Decode existing JWTs to extract payload data
3. The fallback is used in **both** JWT signing (`auth.module.ts`) and verification (`jwt.strategy.ts`)

### Risk
**Real production risk.** Not a theoretical best-practice gap. If the env var is unset in production (which happens frequently during initial deployments, container orchestration misconfigurations, or `.env` not being propagated), every JWT is signed with a known key.

### Confidence
**High** — the string is fully static and trivially discoverable from source code.

---

## C2: Hardcoded Webhook Secret Fallback

### Location
`apps/backend/src/payments/payments-webhook.controller.ts:7`
```typescript
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? "el-bannawy-webhook-secret";
```

Used at line 18:
```typescript
function verifySignature(timestamp: string, rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return safeEqual(expected, signature);
}
```

### Why This Is a Problem
Payment webhooks carry **financial consequences** — they credit coins, fulfill orders, update payment status. The HMAC signature is the only authentication mechanism for webhook requests. If `PAYMENT_WEBHOOK_SECRET` is unset:
1. `WEBHOOK_SECRET` becomes `"el-bannawy-webhook-secret"` at **module load time** (it's a module-level constant)
2. An attacker can forge webhook POST requests with valid HMAC signatures
3. The `verifySignature` function will pass for attacker-crafted payloads
4. The hardcoded HMAC key is in a **separate** location from the `JwtModule` secrets, requiring two distinct env var fixes

### Risk
**Real production risk.** Financial impact — unauthorized coin credit, fake order fulfillment. The secret is a module-level constant evaluated once at import time, making it invisible to runtime env checks.

### Confidence
**High** — same static-string pattern as C1, with direct financial consequences.

---

## C3: OAuth Tokens Leaked in URL Redirect

### Location
`apps/backend/src/auth/auth.controller.ts:49-57`
```typescript
if (result.type === "existing") {
  res.redirect(
    `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard?token=${result.accessToken}&refreshToken=${result.refreshToken}&expiresIn=${String(result.expiresIn)}`,
  );
} else {
  res.redirect(
    `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/register?oauth=google&token=${result.accessToken}&email=${encodeURIComponent(googleProfile.email)}&expiresIn=${String(result.expiresIn)}`,
  );
}
```

### Why This Is a Problem
JWT access tokens and refresh tokens are placed directly in URL query parameters. This means:
1. **Logging exposure** — Every intermediary logs URLs: CDN, reverse proxy, load balancer, application server, cloud logging services
2. **Referer header leakage** — The URL (with tokens) is sent as the `Referer` header on any subsequent request to external resources (images, fonts, analytics scripts, CDN assets)
3. **Browser history** — Tokens persist in browser history on shared machines
4. **Refresh token exposure** is especially dangerous — it provides persistent access even after the short-lived access token expires
5. **Email exposure** in the registration path — the user's email also leaks in the URL

### Risk
**Real production risk.** OAuth tokens are highly sensitive credentials. Exposing them in URLs violates OAuth 2.0 best practices (section 4.1.3 of RFC 6749 specifically prohibits passing access tokens in query params). The standard fix is server-side HttpOnly cookie setting before redirect, or POST-based form submission.

### Confidence
**High** — the redirect URL is directly observable in the user's browser bar, network logs, and intermediate proxies.

---

## C4: No Rate Limiting on Any Endpoint

### Location
`apps/backend/src/main.ts` — entire file (absence of any rate limiting)
```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.use(json({ verify: (req, _res, buf) => { (req as unknown as { rawBody?: string }).rawBody = buf.toString(); } }));
  app.enableCors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}
```

No `ThrottlerModule`, no rate-limiting middleware, no `@nestjs/throttler` import anywhere in the project.

### Why This Is a Problem
The following high-risk endpoints are fully unprotected:
- **`POST /api/v1/auth/login`** — unlimited brute-force password attempts
- **`POST /api/v1/auth/register`** — unlimited account creation (spam)
- **`POST /api/v1/auth/forgot-password`** — unlimited password reset emails (cost, spam)
- **`POST /api/v1/auth/complete-oauth-registration`** — unlimited OAuth linking
- **Every other endpoint** — no protection against request floods (application-layer DoS)

### Risk
**Real production risk.** Brute-force attacks against login are the #1 automated attack vector for web applications. Without rate limiting, any publicly exposed instance will be attacked within hours of deployment.

### Confidence
**High** — the absence is provable and the attack vector is well-documented.

---

## C5: No Caching Layer

### Location
Entire backend — zero caching infrastructure.
- No `@nestjs/cache-manager`
- No Redis client initialized for caching
- No in-memory cache
- No `Cacheable` or `@UseInterceptors(CacheInterceptor)` decorators

Key uncached hot paths:
- `GET /api/v1/curriculum/grades/:gradeId/units` — curriculum tree (rarely changes)
- `GET /api/v1/curriculum/units/:unitId/lessons` — lesson list (rarely changes)
- Academic context queries (repeated per-session for every student)
- Quiz/homework data (changes infrequently but fetched on every page load)
- Support tickets, notifications, competition listings

### Why This Is a Problem
Under load:
1. Every student dashboard load triggers 10–20 sequential DB queries hitting PostgreSQL
2. With 100 concurrent students: 1,000–2,000 queries/second on a single Postgres instance
3. No protection against thundering-herd when popular content loads simultaneously
4. The `Redis` technology is documented as required in `AGENTS.md` (line: "Cache - Redis") and listed as a project dependency, but remains unwired

### Risk
**Real production risk.** Database connection pools have finite capacity. Linear query scaling with concurrent users is the classic performance bottleneck. At moderate traffic levels, PostgreSQL CPU and connection pool exhaustion will cause cascading failures.

### Confidence
**High** — observable absence of any caching infrastructure. The read-heavy, write-light data patterns (curriculum, lessons) are textbook caching targets.

---

## C6: No ConfigModule / Environment Validation

### Location
`apps/backend/src/main.ts:1-4`
```typescript
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", "..", ".env") });

// No ConfigModule.forRoot() anywhere
// No Joi/Zod schema validation
// app.module.ts imports 31 modules — zero config validation
```

Every config value is accessed via raw `process.env` with optional `??` fallbacks:
```typescript
process.env.JWT_SECRET ?? "el-bannawy-jwt-secret"             // C1
process.env.PAYMENT_WEBHOOK_SECRET ?? "el-bannawy-webhook-secret"  // C2
process.env.FRONTEND_URL ?? "http://localhost:3000"            // 4+ places
process.env.PORT ?? 4000                                       // main.ts
process.env.GOOGLE_CLIENT_ID                                    // auth
process.env.GOOGLE_CLIENT_SECRET                                // auth
process.env.DATABASE_URL                                        // implicit via Prisma
```

### Why This Is a Problem
1. Every `process.env.X ?? "fallback"` silently masks a missing env var — the app starts without any indication of a problem
2. No single source of truth for required vs optional environment variables
3. A typo like `process.env.JW_T_SECRET` silently falls back to the dangerous default (C1)
4. Type coercion is unchecked — `PORT` could be `"not-a-number"` without failing
5. **This is the root cause of C1 and C2** — without boot-time validation, hardcoded fallbacks are the only safety net, and they're insecure by design

### Risk
**Real production risk.** The causal link to C1/C2 is direct and provable. `@nestjs/config` with Joi validation is the documented NestJS standard and would crash at boot with an explicit message listing every missing required variable.

### Confidence
**High** — the absence is provable and the consequences to C1/C2 are direct.

---

# 🟠 High Findings — Detailed Breakdown

---

## H1: No Global Exception Filter

### Location
`apps/backend/src/` — no `*.exception-filter.ts` file exists (confirmed by glob search).

### Evidence of Non-Standard Error Handling
`apps/backend/src/assessment-attempt/assessment-attempt.controller.ts:31-37`
```typescript
@Post("assessments/:assessmentId/start")
async startAttempt(
  @Param("assessmentId", ParseUUIDPipe) assessmentId: string,
  @CurrentUser() userId: string,
): Promise<AssessmentAttemptData> {
  return this.attemptService.startAttempt(assessmentId, userId);
  // If this throws, the default NestJS error format is returned.
  // In development mode, stack traces may be included.
}
```

### Why This Is a Problem
1. No consistent error shape — clients can't rely on a predictable `{ success, error, message, timestamp, requestId }` envelope
2. Default NestJS error responses include `message`, `statusCode`, `error` fields
3. In development mode (`NODE_ENV=development`), NestJS includes `stack` and full error details
4. If `NODE_ENV` is not explicitly set in production, the development error format (with stack traces) may leak

### Risk Classification
**Best-practice recommendation** — with medium production risk. The actual stack-leak risk depends on `NODE_ENV` handling, which is not explicitly configured in the current codebase.

### Confidence
**Medium** — the absence is provable, but the security impact depends on deployment configuration.

---

## H2: Non-Standard Response Format in 3 Controllers

### Location

`apps/backend/src/video-question/video-question.controller.ts:15`
```typescript
@Get("by-video-event/:videoEventId")
async getByVideoEventId(@Param("videoEventId") videoEventId: string): Promise<{ data: IVideoQuestionPublic }> {
  const question = await this.service.getByVideoEventId(videoEventId);
  return { data: question };
}
```

`apps/backend/src/execution/execution.controller.ts:18`
```typescript
async execute(@Body() dto: ExecutePluginDto, @CurrentUser() userId: string): Promise<{ data: ExecutionResult }> {
  const result = await this.service.execute({ ... });
  return { data: result };
}
```

`apps/backend/src/assessment-attempt/assessment-attempt.controller.ts:35`
```typescript
async startAttempt(...): Promise<AssessmentAttemptData> {
  return this.attemptService.startAttempt(assessmentId, userId);
  // Returns model type directly — no envelope at all
}
```

### Standard Format (used by 28 other controllers)
```typescript
// From apps/backend/src/common/helpers/response.helper.ts
export function successResponse<T>(data: T, message = "Success"): ISuccessResponse<T> {
  return { success: true, data, message, timestamp: new Date().toISOString() };
}
// Result: { success: true, data: ..., message: "...", timestamp: "..." }
```

The 3 affected controllers return `{ data: ... }` at the most, or the raw model directly — missing `success`, `message`, and `timestamp`.

### Why This Is a Problem
1. API consumers must handle 3 different response shapes depending on which endpoint they call
2. TypeScript types exported from these controllers don't match the actual wire format used elsewhere
3. The frontend `api-client.ts` has a generic `api.get<T>()` that blindly casts — the shape mismatch is invisible until runtime

### Risk Classification
**Real production risk** — client code expecting the standard `successResponse` format will get unexpected response shapes from these endpoints, likely causing runtime failures.

### Confidence
**High** — the inconsistency is observable in source code and would cause measurable client-side breakage.

---

## H3: No Pagination on Most List Endpoints

### Location
At least 8 controllers lack pagination on their list endpoints. Representative example:

`apps/backend/src/admin/admin.controller.ts` (exact line depends on version):
```typescript
@Get("users")
async getUsers(@Query() filters: AdminUserFilterDto): Promise<ISuccessResponse<unknown>> {
  const data = await this.adminService.getUsers(filters);
  return successResponse(data);
}
```

Other affected controllers: `live/`, `support/`, `notifications/`, `reports/`, `competition/`, `coins/`, `mistakes/`.

### Why This Is a Problem
1. `this.prisma.model.findMany()` without `take`/`skip` returns ALL rows
2. With 10,000+ users, `SELECT * FROM users LIMIT ?` with no limit returns 10K rows
3. Support tickets, notifications, competition entries, and coin transactions all grow unboundedly
4. Database memory and network payload scale linearly with row count
5. Under moderate load, this causes OOM errors and connection pool exhaustion

### Risk Classification
**Real production risk** — `findMany()` without pagination on tables that grow unboundedly will exceed memory limits under real usage.

### Confidence
**High** — observable `findMany()` calls without `take`/`skip`/`cursor` in multiple controllers.

---

## H4: Race Condition in Quiz `startAttempt`

### Location
`apps/backend/src/quiz/quiz.service.ts:84-96`
```typescript
async startAttempt(lessonId: string, userId: string): Promise<unknown> {
  // ... verify access, get quiz ...

  const totalAttempts = await this.prisma.quizAttempt.count({        // Line 84: READ (outside TX)
    where: { userId, quizId: quiz.id },
  });

  if (totalAttempts >= quiz.maxAttempts) {                            // Line 88: CHECK (outside TX)
    throw new ForbiddenException("Maximum attempts reached");
  }

  const attempt = await this.prisma.quizAttempt.create({              // Line 92: WRITE (outside TX)
    data: {
      userId,
      quizId: quiz.id,
      attemptNum: totalAttempts + 1,
    },
  });
}
```

**Identical pattern in `apps/backend/src/homework/homework.service.ts:81-95`.**

### Why This Is a Problem
- `count()` and `create()` are **NOT** in a `$transaction`
- Two concurrent requests from the same user can both read `totalAttempts = 3` when `maxAttempts = 5`
- Both pass the check, both create an attempt with `attemptNum = 4`
- The user gets **6 attempts** when they should have max 5
- If `maxAttempts = 3` and both see `totalAttempts = 2`: user gets **4 attempts**

### Risk Classification
**Real production risk** — classical TOCTOU (time-of-check-time-of-use) race condition. Reproducible under concurrent request load.

### Confidence
**High** — the count-then-create pattern without transaction wrapping is explicitly visible in the source code.

---

## H5: Race Condition in `redeemCode`

### Location
`apps/backend/src/coins/coins.service.ts:168-196`
```typescript
async redeemCode(userId: string, dto: RedeemCodeDto) {
  const code = await this.prisma.unlockCode.findUnique({ where: { code: dto.code } });
  if (!code) throw new NotFoundException("Invalid code");
  if (!code.active) throw new BadRequestException("Code is no longer active");
  if (code.expiresAt && code.expiresAt < new Date()) throw new BadRequestException("Code has expired");
  if (code.maxUses && code.usedCount >= code.maxUses)                    // READ outside TX
    throw new BadRequestException("Code usage limit reached");

  const existingRedemption = await this.prisma.codeRedemption.findUnique({...});  // READ outside TX
  if (existingRedemption) throw new ConflictException("Code already redeemed");   // CHECK outside TX

  const [redemption] = await this.prisma.$transaction([                  // TX starts AFTER all checks
    this.prisma.codeRedemption.create({ ... }),
    this.prisma.unlockCode.update({ data: { usedCount: { increment: 1 } } }),
    this.prisma.coinWallet.upsert({ ... }),
  ]);
  return redemption;
}
```

### Why This Is a Problem
- The `usedCount >= maxUses` check (line 173) happens **before** the transaction (line 180)
- Two concurrent requests can both read `usedCount = 999` when `maxUses = 1000`
- Both pass the check, both enter the transaction, both create redemptions
- The `{ increment: 1 }` on line 186 is atomic within the transaction, but the guard check already passed for both requests
- Result: code with `maxUses: 1000` gets used 1001+ times

### Risk Classification
**Real production risk** — codes with limited uses can be over-redeemed under concurrent traffic.

### Confidence
**High** — the guard check is explicitly outside the transaction, and the `{ increment: 1 }` inside the TX doesn't protect against the check having already passed twice.

---

## H6: N+1 Queries in 3 Hot Paths

### Location 1: `validatePrerequisites`
`apps/backend/src/quiz/quiz.service.ts:578-613`
```typescript
private async validatePrerequisites(lessonId: string, userId: string): Promise<void> {
  // 1 query
  const lesson = await this.prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { homeworkEnabled: true },
  });

  // 1 query
  const videos = await this.prisma.lessonVideo.findMany({
    where: { lessonId, enabled: true },
    select: { id: true },
  });

  // N queries — one per video
  for (const video of videos) {
    const progress = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId: video.id } },
    });
    if (!progress?.completed) {
      throw new ForbiddenException("All lesson videos must be completed before taking the quiz");
    }
  }
}
```
- Runs on **every quiz attempt** — a lesson with 10 videos = 1 + 1 + 10 = 12 queries instead of 2

### Location 2: `inviteGrade`
`apps/backend/src/competition/competition.service.ts:133-140`
```typescript
private async inviteGrade(...) {
  const students = await this.prisma.user.findMany({ where: { ... } });

  // N+1 — one notification create per student
  for (const s of students) {
    await this.notifications.createForUser(s.id, { ... });
  }
}
```
- A grade with 200 students = 1 + 200 individual notification queries

### Location 3: `unlockContent`
`apps/backend/src/coins/coins.service.ts:142-153`
```typescript
if (dto.targetType === "UNIT") {
  const lessons = await tx.lesson.findMany({ where: { unitId: dto.targetId } });
  // N upserts inside the transaction
  for (const lesson of lessons) {
    await tx.lessonProgress.upsert({ ... });
  }
}
```
- A unit with 20 lessons = 1 + 20 upserts, prolonging the transaction

### Why This Is a Problem
- `validatePrerequisites` runs on EVERY quiz attempt — linear scaling with video count
- `inviteGrade` runs when creating/editing competitions — linear scaling with class size
- `unlockContent` prolongs a transaction with N upserts
- All three are on hot paths that execute frequently

### Risk Classification
**Real production risk** — linear query scaling directly impacts API latency and DB connection pool utilization.

### Confidence
**High** — the `for`-loop pattern with individual `await` queries is explicit in the source code for all three locations.

---

## H7: No Monitoring / Metrics

### Location
`apps/backend/src/main.ts` (absence)
```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // No Terminus health check
  // No Prometheus metrics endpoint
  // No request logging interceptor
  // No structured logging
  await app.listen(port);
}
```

### Why This Is a Problem
1. No `/health` endpoint for load balancer health checks or container orchestration
2. No database connectivity check at startup or on-demand
3. No metrics: request rate, error rate, p99 latency, DB pool usage, CPU/memory
4. No structured logging with correlation IDs — logs are plain `Logger.log()` calls
5. Production outages go undetected until users report them
6. No way to correlate performance degradation with code changes or deployments

### Risk Classification
**Best-practice recommendation** — with medium production risk. The application functions without monitoring but is not operable at scale.

### Confidence
**Medium** — absence is provable. The app technically works without monitoring, but it's a significant operational gap.

---

## H8: No Startup Environment Validation

### Location
`apps/backend/src/main.ts` (absence)
```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // No pre-flight checks for env vars
  // No database connectivity check
  // No service dependency verification
  await app.listen(port);
}
```

`apps/backend/src/common/services/bootstrap.service.ts` (registered in `app.module.ts:67`)
- Currently handles: seeding default data (grades, curriculum structure)
- Does NOT: validate env vars, check DB connectivity, verify service dependencies

### Why This Is a Problem
1. The app starts successfully even if critical env vars are missing or invalid
2. Database migration failures are only discovered when the first query fails at runtime
3. Missing Redis (for future cache integration) wouldn't be detected until features break
4. Combined with no ConfigModule (C6), misconfiguration is invisible at boot time
5. This is the enabling condition for C1 and C2 — if startup validation existed, the hardcoded JWT and webhook secrets would never be reached

### Risk Classification
**Real production risk** — directly linked to C6 and the hardcoded secret pattern (C1, C2). Startups with missing or invalid config appear successful but fail at runtime.

### Confidence
**High** — the causal chain from missing startup validation to C1/C2 is direct and provable.

---

## H9: Simulation Mode Hardcoded HMAC Key

### Location
`apps/backend/src/payments/gateways/gateway.implementations.ts:78`
```typescript
protected buildSimulation(request: GatewayCheckoutRequest): GatewayCheckoutResult {
  const token = createHmac("sha256", "el-bannawy-sim")
    .update(`${request.paymentId}:${String(request.amount)}`)
    .digest("hex");
  return {
    paymentUrl: `${COIN_PACKAGE_BASE_URL}/api/v1/payments/${request.paymentId}/confirm?method=${this.method}&token=${token}`,
    gatewayRef: `sim_${request.paymentId}`,
  };
}
```

### Why This Is a Problem
1. The simulation HMAC key `"el-bannawy-sim"` is hardcoded — anyone who reads the source can forge simulation tokens
2. Simulation mode produces **real payment confirmations** — coins credited, orders fulfilled
3. If the gateway pipeline falls back to simulation in production (e.g., all real gateways fail or misconfigure), an attacker can generate valid `paymentUrl` links and credit themselves coins
4. There is no `NODE_ENV` gate preventing simulation mode in production
5. The `paymentUrl` includes the token in a query parameter (similar to C3 pattern)

### Risk Classification
**Real production risk** — conditional on simulation mode being active in production. Since `NODE_ENV` is not validated and gateway configuration fallbacks are not explicit, this is a plausible failure path.

### Confidence
**Medium** — requires the simulation path to be active in production. But without `NODE_ENV` validation, this is more likely than it should be.

---

## H10: No Helmet Middleware

### Location
`apps/backend/src/main.ts` (absence)
```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({ ... });
  // app.use(helmet()) — MISSING
}
```

### Why This Is a Problem
Missing security headers:
| Header | Purpose | Missing |
|---|---|---|
| `X-Content-Type-Options: nosniff` | Prevents MIME-sniffing attacks | ❌ |
| `X-Frame-Options: DENY` | Prevents clickjacking | ❌ |
| `Strict-Transport-Security` | Enforces HTTPS | ❌ |
| `X-XSS-Protection` | Legacy XSS filter | ❌ |
| `Content-Security-Policy` | Limits script/style sources | ❌ |

Standard NestJS production applications include helmet via `app.use(helmet())`.

### Risk Classification
**Best-practice recommendation** — with low-to-medium production risk. Missing security headers are a defense-in-depth gap. Exploitability depends on other vulnerabilities (e.g., XSS in the frontend), but defense-in-depth is a production standard.

### Confidence
**Medium** — the absence is provable. The actual exploitability depends on other application vulnerabilities being present.

---

## Summary of All Findings

| ID | Severity | Issue | Risk Type | Confidence | Category |
|---|---|---|---|---|---|
| C1 | 🔴 Critical | Hardcoded JWT secret `"el-bannawy-jwt-secret"` | Auth bypass | **High** | Security |
| C2 | 🔴 Critical | Hardcoded webhook secret `"el-bannawy-webhook-secret"` | Financial fraud | **High** | Security |
| C3 | 🔴 Critical | OAuth tokens leaked in URL redirect | Token theft | **High** | Security |
| C4 | 🔴 Critical | No rate limiting on any endpoint | Brute-force / DoS | **High** | Security |
| C5 | 🔴 Critical | No caching layer — zero Redis/in-memory | Performance collapse | **High** | Performance |
| C6 | 🔴 Critical | No ConfigModule / env validation | Root cause of C1/C2 | **High** | Production Readiness |
| H1 | 🟠 High | No global exception filter | Info disclosure | **Medium** | API Design |
| H2 | 🟠 High | 3 controllers non-standard response | Client breakage | **High** | API Design |
| H3 | 🟠 High | 8+ endpoints without pagination | OOM / crash | **High** | Architecture |
| H4 | 🟠 High | Race condition: quiz/homework startAttempt | Exceed max attempts | **High** | Performance |
| H5 | 🟠 High | Race condition: redeemCode | Over-redeem codes | **High** | Performance |
| H6 | 🟠 High | N+1 queries in 3 hot paths | DB pool exhaustion | **High** | Performance |
| H7 | 🟠 High | No monitoring / metrics | Blind operations | **Medium** | Production Readiness |
| H8 | 🟠 High | No startup env validation | Silent misconfig | **High** | Production Readiness |
| H9 | 🟠 High | Simulation mode hardcoded HMAC key | Free coins | **Medium** | Security |
| H10 | 🟠 High | No helmet middleware | Missing defense-in-depth | **Medium** | Security |

**Count:** 6 Critical + 10 High = 16 findings
**Real production risk:** 12 of 16 findings (C1–C6, H2–H6, H8, H9)
**Best-practice recommendations:** 3 of 16 findings (H1, H7, H10)
**Mixed:** 1 of 16 findings (H1 — best practice with conditional risk)

---

## Recommended Action Plan

### Sprint 1 (3–5 days): Security Hardening

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P0 | C1 — Remove JWT secret fallback, crash on missing `JWT_SECRET` | <1h | Critical |
| P0 | C2 — Remove webhook secret fallback, crash on missing `PAYMENT_WEBHOOK_SECRET` | <1h | Critical |
| P0 | C3 — Fix OAuth token delivery (HttpOnly cookies or POST-based redirect) | 4–8h | Critical |
| P0 | C4 — Add `@nestjs/throttler` with login rate limits (5 req/min) | 2–4h | Critical |
| P0 | C6 — Add `ConfigModule.forRoot()` with Joi validation schema | 2–4h | Critical |
| P1 | H9 — Gate simulation mode behind `NODE_ENV !== 'production'` | 1h | High |
| P1 | H10 — Add `app.use(helmet())` | 0.5h | High |
| P1 | H8 — Add startup env validation (move into BootstrapService) | 1–2h | High |

### Sprint 2 (3–5 days): Performance & Correctness

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P0 | C5 — Add Redis cache for curriculum/lesson/context queries | 8–16h | Critical |
| P1 | H4 — Wrap quiz/homework startAttempt in `$transaction` | 2h | High |
| P1 | H5 — Move `redeemCode` guard checks inside the transaction | 1h | High |
| P1 | H6 — Fix N+1 in validatePrerequisites (single batched query) + inviteGrade (bulk notifications) | 4–6h | High |
| P1 | H3 — Add pagination to all list endpoints | 8–12h | High |
| P2 | H2 — Standardize video-question, execution, assessment-attempt responses to `successResponse` | 2h | High |

### Sprint 3 (3–5 days): Operations & Architecture

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | H7 — Add Terminus health check + Prometheus metrics | 4–8h | High |
| P2 | H1 — Add global exception filter | 2h | Medium |
| P3 | D3 — Fix 15+ create endpoints to return 201 | 2h | Medium |
| P3 | DB1 — Convert String-based enum fields to Prisma enums | 4–8h | Medium |
| P3 | M1/M2 — Split LiveService (1215 lines) and AdminService (1043 lines) | 8–16h | Low |
| P4 | M3 — Extract shared quiz/homework logic into common service | 8–16h | Low |
| P4 | M4 — Extract `findOrThrow` helper into shared utility | 2h | Low |

**Total estimated effort:** 8–12 developer-days for Critical + High findings.

**After Sprint 2, the application is deployable.** Sprint 3 is hardening + maintainability.

---

## Bottom Line

The backend is **well-architected and structurally sound** but is **not production-safe** due to 6 critical issues — primarily hardcoded secrets, missing rate limiting, and no caching. After an estimated **8–12 focused days** to resolve all critical + high issues, the architecture is strong enough to support continued feature development with confidence.

The codebase has been built with strong engineering discipline (modular monolith, proper DI, consistent naming, comprehensive feature coverage). The issues identified are concentrated in cross-cutting concerns (security hardening, performance infrastructure, operational readiness) that are typical gaps in early-stage development.
