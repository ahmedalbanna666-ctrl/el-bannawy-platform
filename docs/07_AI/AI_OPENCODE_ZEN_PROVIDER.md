# AI_MODELS — OpenCode Zen Provider (DeepSeek V4 Flash Free)

## Provider Overview

OpenCode Zen is an OpenAI-compatible API gateway. This platform integrates it as a
first-class AI provider routed through the existing `AiProviderService` abstraction.

| Field | Value |
|---|---|
| Provider | `opencode` |
| Base URL | `https://opencode.ai/zen/v1` |
| Chat Completions endpoint | `https://opencode.ai/zen/v1/chat/completions` |
| API contract | OpenAI-compatible Chat Completions |

### Currently active model

The originally-specified model `deepseek-v4-flash-free` is **recognized** by OpenCode
Zen but currently reports `Model is unavailable` from the upstream provider (external
availability issue, not a code defect). The active provider config currently uses a
different working **free** OpenCode Zen model:

| Field | Value |
|---|---|
| Active model | `nemotron-3-ultra-free` |
| Status | Verified working (returns real LLM completions) |

Other free OpenCode Zen models verified working as alternatives:
`laguna-s-2.1-free`, `nemotron-3.5-lightning-free`.

> **Important:** OpenCode Zen free models are **free** but their availability, rate
> limits, and terms can change at any time. The model is fully replaceable: it is
> configured via the database-driven model registry and can be disabled or swapped
> without changing any code. If `deepseek-v4-flash-free` becomes available again, it can
> be re-registered via Admin (or `OPENCODE_DEFAULT_MODEL`) with no code changes.

## Environment Variables

All OpenCode variables are **backend-only**. Never prefix them with `NEXT_PUBLIC_`
and never expose them to the frontend.

| Variable | Required | Default |
|---|---|---|
| `OPENCODE_API_KEY` | Yes (when provider enabled) | *(none)* |
| `OPENCODE_BASE_URL` | No | `https://opencode.ai/zen/v1` |
| `OPENCODE_DEFAULT_MODEL` | No | `deepseek-v4-flash-free` |

The API key is read from the environment at backend startup and **encrypted at rest**
using the platform's `EncryptionService` (AES-256-GCM). It is never returned by any
API endpoint, never logged, and never stored in plaintext.

## Architecture

OpenCode is integrated into the existing provider abstraction — it is not a separate
AI system:

```text
Frontend
   ↓
POST /api/v1/ai/chat  (existing endpoint, unchanged)
   ↓
AiService
   ↓
AiProviderService
   ├── OPENAI / GEMINI / CLAUDE  (existing)
   └── opencode  → OpenAI-compatible Chat Completions path
          ↓
    POST https://opencode.ai/zen/v1/chat/completions
           ↓
    OpenCode Zen → <active free model, e.g. nemotron-3-ultra-free>
 ```

### Endpoint construction

The stored `baseUrl` is the API root (`https://opencode.ai/zen/v1`). The provider
layer appends `/chat/completions` at request time (`buildOpenAiEndpoint`), so the
final URL is always:

```text
https://opencode.ai/zen/v1/chat/completions
```

If a stored `baseUrl` already ends with `/chat/completions`, it is used as-is
(backward compatible).

### Request body (OpenAI-compatible)

The `model` field is the model id from the active `ai_model_configs` row
(currently `nemotron-3-ultra-free`; originally specified as `deepseek-v4-flash-free`).

```json
{
  "model": "nemotron-3-ultra-free",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": false
}
```

## Bootstrap / Registration

On backend startup, `AiSettingsService.onModuleInit` calls
`bootstrapOpenCodeProvider()`. If `OPENCODE_API_KEY` is set, it creates or updates the
`ai_model_configs` row for provider `opencode` / model `OPENCODE_DEFAULT_MODEL`
(default `deepseek-v4-flash-free`) with the key encrypted at rest. If the key is
absent, the provider is not registered and the existing fallback behaviour is
preserved.

In practice the active provider config is registered via the **Admin AI settings API**
(`POST /api/v1/ai-settings/model-configs`) with the chosen working free model (e.g.
`nemotron-3-ultra-free`) and the API key — stored encrypted at rest, never in code
or plaintext. The model can be swapped at any time without code changes.

## Failover & Errors

OpenCode participates in the existing priority-ordered provider failover. Provider
errors (401, 403, 404, 429, 5xx, timeout, malformed response) are caught, the
provider is marked unhealthy, and the next configured provider (or the rule-based
tutor) is used. No API key or sensitive upstream body is exposed to clients.

### Configured OpenCode failover chain (all free, all verified working)

| Priority | Model | Role |
|---|---|---|
| 0 | `nemotron-3-ultra-free` | Primary |
| 1 | `nemotron-3.5-lightning-free` | Failover 1 |
| 2 | `laguna-s-2.1-free` | Failover 2 |

If the primary is rate-limited (429) or unavailable, the request automatically
fails over to the next model. All are registered in `ai_model_configs` with the API
key encrypted at rest. Any of these can be activated/deactivated from the Admin
AI settings page.

## Streaming

OpenCode uses the same SSE streaming path as OpenAI-compatible providers
(`streamOpenAi`), so the existing frontend streaming contract is preserved
(`event: meta / delta / done`).

## Security

- API key exists only on the backend (encrypted at rest).
- API key is never bundled into the Next.js client.
- API key is never returned by an API response or logged.
- The browser never calls OpenCode directly — all calls go through `/api/v1/ai/chat`.
- CORS does not expose provider credentials.

## Admin

The Admin AI settings page lists `OpenCode Zen` as a provider option. Any OpenCode
Zen model (e.g. `deepseek-v4-flash-free`, `nemotron-3-ultra-free`, `laguna-s-2.1-free`)
can be created/edited there like any other model config (status: configured / not
configured via health probes). The currently active free model is `nemotron-3-ultra-free`.
