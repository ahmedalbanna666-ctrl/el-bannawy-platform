# AI_RAG_ARCHITECTURE.md

# El-bannawy Platform
## Retrieval-Augmented Generation (RAG)

Version: 1.0.0

---

# Purpose

Defines the Retrieval-Augmented Generation architecture.

RAG is the only approved knowledge source for educational responses.

---

# Knowledge Sources

Lesson Content

Vocabulary

Grammar Notes

Stories

Homework

Teacher Notes

Official Curriculum

Platform Documentation

---

# Retrieval Flow

Student Question

↓

Embedding

↓

Vector Search

↓

Top K Results

↓

Prompt Builder

↓

LLM

↓

Validated Response

---

# Vector Database

Provider Agnostic

Examples

Qdrant

Pinecone

Weaviate

pgvector

Version 1

PostgreSQL + pgvector

---

# Chunk Size

500–1000 Tokens

Overlap

100 Tokens

---

# Metadata

Lesson

Unit

Grade

Difficulty

Language

Topic

Version

---

# Ranking

Semantic Similarity

Curriculum Priority

Lesson Priority

Recency

Confidence

---

# Response Rules

Never answer without retrieved evidence.

Always cite lesson context internally.

---

# Acceptance Criteria

✓ Accurate Retrieval

✓ Fast Search

✓ Curriculum Aware

✓ Scalable

---

# Final Rule

RAG is the primary knowledge source.

The LLM is responsible for explanation, not knowledge storage.

End of Document.