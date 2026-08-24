# AI Architecture

Version: 3.0.0
Status: Active — enterprise AI features implemented (provider abstraction, streaming, prompt versioning, credits, analytics)

## Current Runtime

The AI module provides authenticated conversation CRUD, non-streaming and SSE-streaming chat, recent-message context, optional lesson/unit/grade context, RAG retrieval over pgvector, multi-provider chat completion with failover, a deterministic rule-based fallback, prompt-template versioning, per-user AI credit ledger, usage/analytics dashboards, and recommendations derived from incorrect quiz answers.

```text
Client -> JWT -> AiController -> AiService -> Prisma conversation history
                                      |
                                      +-> AiProviderService (configurable providers, priority failover)
                                      |     +-> OpenAI / Gemini / Claude adapters
                                      |     +-> OpenCode Zen adapter (OpenAI-compatible, `deepseek-v4-flash-free`)
                                      |     +-> SSE streaming
                                      |     +-> health probes
                                      +-> AiSettingsService
                                      |     +-> teaching styles
                                      |     +-> prompt templates + version registry
                                      |     +-> credit plans / packages / student credits
                                      |     +-> usage + moderation logs + analytics
                                      +-> rule-based fallback
                                      +-> RAG (pgvector) via AiKnowledgeBaseService
```

## Current Endpoints

### Chat / conversations (`/api/v1/ai`)

- `POST/GET /api/v1/ai/conversations`
- `GET/DELETE /api/v1/ai/conversations/:conversationId`
- `PATCH /api/v1/ai/conversations/:conversationId/favorite`
- `GET /api/v1/ai/conversations/favorites`
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/chat/stream` (SSE: `event: meta|delta|done|error`)
- `POST /api/v1/ai/messages/:messageId/feedback`
- `POST /api/v1/ai/regenerate`
- `GET /api/v1/ai/recommendations`

### AI settings / operations (`/api/v1/ai-settings`, ADMIN + TEACHER scoped)

- Teaching styles CRUD + active style
- Model configs CRUD (encrypted API keys, masked on read) + provider health probes
- Credit plans CRUD, packages CRUD + `packages/:packageId/assign/:userId`
- Prompt templates CRUD + `rollback`, `preview`, `test` (version registry)
- `credits/my`, `credits/check`, `credits/history`, `credits/add`
- `usage-logs`, `usage-stats`, `moderation-logs`
- `analytics?range=day|week|month|year`
- `health` overview

### Knowledge base (`/api/v1/ai-knowledge-base`)

- Sources CRUD (PDF/DOCX/TXT/MD/JSON/URL/LESSON/UNIT/STORY/REVIEW), reindex, search
- `PATCH sources/:id/enable` (enable/disable sources; search defaults to enabled only)
- `GET stats` (sources/chunks/embedding coverage by type)
- `GET search/preview` (admin preview, includes disabled sources)

## Current Context

- Up to the recent ten conversation messages are loaded for chat context.
- If `lessonId` is supplied, the lesson title, unit title, and grade name are added to the prompt context.
- RAG results (when available) are injected as retrieved curriculum context.
- The system prompt is built from the active prompt template + active teaching style.
- Output is redacted (emails, phones, non-allowlisted links) before persisting.
- Credits are checked before chat and consumed after each completion (or streamed completion).

## Not Implemented (target architecture only)

- AI scoring of subjective speaking/writing responses
- Image/PDF understanding via vision models and specialized autonomous agents
- Voice conversation, pronunciation assessment, AI study planner / flashcards

The documents in this directory describe the target architecture for those features. They must not be used as evidence that the features are live.

## Safety Boundary

The AI endpoint must remain authenticated, must not expose API keys or internal prompts, and must not be marketed as a curriculum-grounded RAG tutor until retrieval and response validation are implemented. Providers are validated (JWT + RBAC), API keys are encrypted at rest and masked on read, and every AI request passes through context → memory → RAG → prompt → provider → response-validation → logging.

End of Document.
