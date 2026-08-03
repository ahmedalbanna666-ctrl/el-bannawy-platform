-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Migrate AiKnowledgeChunk.embedding from Json (JSONB) to vector(1536)
ALTER TABLE "ai_knowledge_chunks" DROP COLUMN IF EXISTS "embedding";

ALTER TABLE "ai_knowledge_chunks" ADD COLUMN "embedding" vector(1536);

-- HNSW index for fast approximate similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS "ai_knowledge_chunks_embedding_idx"
  ON "ai_knowledge_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
