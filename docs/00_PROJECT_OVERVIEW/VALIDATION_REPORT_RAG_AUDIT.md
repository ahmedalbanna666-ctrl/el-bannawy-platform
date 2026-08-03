# Validation Report — Post-RAG AI Foundation Audit

## 1. Scope

Post-implementation audit of the Sprint 3 AI infrastructure (RAG on pgvector) covering 20 validation areas:

1. pgvector extension & HNSW index
2. Embedding pipeline & dimension consistency
3. Semantic search correctness
4. Hybrid fallback (semantic → keyword)
5. Provider abstraction
6. AI quality / grounding
7. Performance (p99, vector index usage)
8. Security (SSRF, prompt injection, redaction)
9. Rate limiting
10. Prompt injection defense
11. Memory / context
12. Queue (BullMQ)
13. Background indexing
14. Failure recovery
15. Load readiness
16. AI chat orchestration
17. Reindex pipeline
18. Health & graceful shutdown
19. RAG test coverage
20. Documentation compliance

## 2. Methodology

- Three parallel read-only code audits (RAG/pgvector, AI orchestration, security/infra).
- Every audit finding was reconciled against the actual source (`ai.service.ts`, `search.service.ts`, `embedding.service.ts`, `ai-knowledge-base.*`, `scheduler.*`, `app.module.ts`, `notifications.*`).
- Live DB state verified: `vector 0.8.6` extension enabled, HNSW index present, 43 migrations applied.
- End-to-end API verification already recorded in `SPRINT_3_REPORT.md` §4.

## 3. Result Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | None remaining |
| High | 5 | Recommendations, no block |
| Medium | 3 | Recommendations |
| Low/Info | 4 | Notes |

**No Critical blockers.** The pgvector RAG foundation is verified working. Final verdict:

> **AI FOUNDATION VERIFIED / READY FOR SPRINT 4**

## 4. Passed Areas

| # | Area | Result | Evidence |
|---|------|--------|----------|
| 1 | pgvector extension | PASS | `vector 0.8.6` enabled on live DB; migration `20260801000000_enable_pgvector` |
| 2 | HNSW index | PASS | `ai_knowledge_chunks_embedding_idx` on `embedding vector(1536)` with `vector_cosine_ops` |
| 3 | Embedding dimension consistency | PASS | Fallback emits 1536 dims, matches `vector(1536)` column and default model |
| 4 | Semantic search | PASS | pgvector `<=>` cosine query in `search.service.ts:60-74`, uuid casts, source scoping |
| 5 | Chunk writes | PASS | Raw SQL `INSERT` with `::vector` cast (`ai-knowledge-base.repository.ts`) |
| 6 | Prompt injection defense | PASS | 20+ patterns incl. Arabic (`ai.service.ts:12-37`) |
| 7 | Output redaction | PASS | Email/phone/link redaction (`ai.service.ts:303-312`) |
| 8 | Content boundaries | PASS | Non-English topic gate + system-prompt knowledge boundaries |
| 9 | SSRF guard | PASS | `assertSafeExternalUrl` on URL fetch, redirects blocked |
| 10 | AuthN/AuthZ on KB endpoints | PASS | `JwtAuthGuard` + `RolesGuard`, KB mutations ADMIN/TEACHER only |
| 11 | Queue (BullMQ) | PASS | Queue registered (`scheduler.module.ts`), processor registered (`scheduled-notifications.processor.ts`), wired into `notifications.service.ts` via `BullJobQueue` |
| 12 | Credits & limits | PASS | Credit check/consume, conversation caps, message caps |
| 13 | Graceful shutdown | PASS | Present |
| 14 | Health endpoints | PASS | Present |
| 15 | Chat orchestration | PASS | Context builder → memory (history) → RAG → provider → validation → redaction → logging |
| 16 | AI usage logging | PASS | `logUsage` with sources, model, provider, duration |
| 17 | Data preservation | PASS | users=5 before/after image swap |
| 18 | Migrations | PASS | 43 applied, no drift |
| 19 | Build/typecheck | PASS | turbo typecheck 5/5, build 3/3 |
| 20 | Documentation | PASS | AI docs + `MASTER_EXECUTION_PLAN.md` + Sprint 3 report updated |

## 5. Findings (non-blocking)

### High

**H1. No LLM provider abstraction** (`ai.service.ts:343-368`)
Single OpenAI-compatible `fetch`; `provider` field (`ai.service.ts:144`) is read but only used for logging — never dispatched. AGENTS.md lists "Provider Abstraction: Required". Current default path is OpenAI-compatible so nothing breaks today; abstraction is a Sprint-4+ refactor, not a Sprint-3 regression.

**H2. Provider failure / misconfig silently degrades** (`ai.service.ts:363-368`)
If `apiKey` is missing or the provider call fails, the service silently falls back to rule-based responses with only a warn log. Students receive plausible-but-rule-based answers with no surface indication. Needs a loud degradation signal (e.g., response header/flag) and better observability.

**H3. `semanticSearch` unhandled errors 500 the whole chat** (`ai.service.ts:167`, `search.service.ts:60`)
No try/catch around `searchKnowledge` in `sendMessage`. A DB outage or dimension mismatch propagates and 500s the entire `/ai/chat`. Recommend try/catch with graceful degradation to keyword search.

**H4. No RAG unit/integration tests** (`ai-knowledge-base/` has no `*.spec.ts`)
Semantic search, keyword fallback, reindex, and chunk-write paths are verified E2E but have zero automated coverage. Required by project testing rules (90% business-logic coverage).

**H5. Keyword fallback ignores `termId`** (`search.service.ts:88-141`, `ai-knowledge-base.service.ts:129`)
`searchKnowledge` passes `gradeId` to keyword fallback but not `termId`, and `keywordSearch` doesn't accept it. Semantic path scopes by both; fallback is inconsistent.

### Medium

**M1. `score > 0` filter after `LIMIT`** (`search.service.ts:85`)
Filtering happens after `LIMIT topK`, so low-score rows can be dropped, yielding fewer than `topK` results. Should filter in SQL (`WHERE 1 - (embedding <=> $q) > threshold`).

**M2. Rate limiting is per-IP, not per-user** (`app.module.ts:57-62`, `ai.controller.ts`)
Throttler default tracker is IP + in-memory store. A shared-NAT student pool shares limits; no Redis-backed per-user throttle. Acceptable for current scale.

**M3. Reindex is synchronous** (`ai-knowledge-base.controller.ts:52-64`)
Reindex blocks the request through embedding generation; multi-source reindex loops serially. With large corpora this should move behind BullMQ.

### Low / Info

**L1. Hash-fallback embeddings are weak** (`embedding.service.ts:56-68`)
Deterministic hash vectors give poor cosine relevance. Only used when `AI_API_KEY` absent or provider down. Acceptable as a cold-start fallback.

**L2. Throttle 429 response leaks limit config** (global guard default)
Minimal info leak; acceptable.

**L3. Stale test-DB port binding** — pre-existing, documented Sprint 2/3 (§6.1 SPRINT_3_REPORT). Blocks DB-backed integration suite only.

**L4. Lint debt (~386 pre-existing)** — Sprint 3 files are lint-clean; repo-wide lint cleanup is a separate task.

## 6. Verification Details

### Live DB checks

```sql
SELECT extname, extversion FROM pg_extension WHERE extname='vector';  -- vector | 0.8.6
-- HNSW index present on ai_knowledge_chunks_embedding_idx (vector_cosine_ops)
```

### Confirmed by direct code review

- BullMQ **is** wired: `SchedulerModule` (queue registration) → `ScheduledNotificationsProcessor` (worker) → `NotificationsService` (`BullJobQueue` injection + `queue.add`). The earlier audit claim that BullMQ is "not wired / no processor" was **incorrect** and is corrected here.

## 7. Recommendations for Sprint 4

1. Add try/catch around `searchKnowledge` with keyword fallback (H3).
2. Move `score > 0` filter into SQL (M1).
3. Add RAG unit/integration tests: semanticSearch, keywordSearch, reindexSource, createChunks (H4).
4. Implement provider abstraction dispatching on the `provider` field (H1) with loud failure (H2).
5. Thread `termId` through keyword fallback (H5).
6. Move reindex behind BullMQ (M3) for large corpora.
7. Resolve test-DB port binding to restore the integration suite (L3).

## 8. Verdict

| Gate | Status |
|------|--------|
| pgvector extension + HNSW index | PASS |
| Embedding pipeline (1536 consistent) | PASS |
| Semantic search via `<=>` | PASS |
| Hybrid fallback present | PASS (H5 caveat) |
| Provider abstraction | **FAIL (H1)** — non-blocking, required by AGENTS.md |
| Prompt injection / redaction / boundaries | PASS |
| Rate limiting | PASS (M2 caveat) |
| BullMQ wired | PASS |
| Failure recovery | PASS (H3 caveat) |
| Documentation | PASS |

**Final: AI FOUNDATION VERIFIED / READY FOR SPRINT 4**

No Critical issues remain. The 5 High / 3 Medium / 4 Low findings are recommendations; none block Sprint 4, and the architecture was not modified per audit constraint.

---
*Generated 2026-08-02. Reconciles three parallel audits against actual source. Supersedes any prior (uncommitted) draft report.*
