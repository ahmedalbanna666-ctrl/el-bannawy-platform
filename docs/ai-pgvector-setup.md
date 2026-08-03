# pgvector Setup for AI Semantic Search

The AI Knowledge Base uses pgvector for vector similarity search on embeddings.

## Prerequisites

- PostgreSQL 14+
- pgvector extension

## Installation

Run the following SQL on your PostgreSQL database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index on embedding column for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding
  ON ai_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

The `embedding` field is optional. If pgvector is not installed, the system falls back to keyword-based (TF-IDF) search automatically.
