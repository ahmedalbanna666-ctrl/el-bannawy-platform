# AI RAG Architecture

Version: 2.1.0
Status: Active; pgvector retrieval runtime wired

## Current State

The `AiKnowledgeBaseService` indexes approved content into `AiKnowledgeChunk` records with 1536-dimensional pgvector embeddings. `SearchService.semanticSearch` runs a pgvector cosine-similarity query (`<=>`) scoped by grade/term/subject and authorized source filters, then falls back to `keywordSearch`. `AiService` retrieves RAG results via `searchKnowledge` before building the response.

## Target Flow

```text
Authenticated question -> academic context -> approved content retrieval (pgvector)
-> prompt builder -> provider -> response validation -> safe response + audit/usage event
```

## Required Future Inputs

Lesson documents, structured vocabulary, questions, stories, final review content, and approved teacher notes must be indexed with academic-context metadata and content versioning.

## Required Guardrails

- Retrieval must be scoped by the student's authorized academic context.
- No answer may expose hidden prompts, private records, or internal documentation.
- No-citation/no-evidence behavior must be defined before allowing curriculum claims.
- Prompt injection, stale content, deletion, and reindex behavior need tests.
- Model responses require a typed validation layer and fallback behavior.

## Dependencies Wired

pgvector (`pgvector/pgvector:pg16`, extension `vector`), embedding provider (`text-embedding-3-small` with 1536-dim fallback), chunking/index service, pgvector retrieval service. Prompt registry, response validator, and usage analytics remain future work.

End of Document.
