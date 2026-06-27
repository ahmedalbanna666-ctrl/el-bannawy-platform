# AI_ORCHESTRATOR.md

# El-bannawy Platform
## AI Orchestrator

Version: 1.0.0

---

# Purpose

Defines the orchestration layer responsible for coordinating AI requests.

The Orchestrator decides:

- Which agent to use
- Which context to load
- Which provider to call
- Which response to return

---

# Workflow

Request

↓

Authentication

↓

Intent Detection

↓

Context Builder

↓

Agent Selection

↓

RAG

↓

LLM

↓

Validation

↓

Response

---

# Intent Categories

Lesson

Grammar

Vocabulary

Homework

Translation

Writing

Conversation

Image Analysis

PDF Analysis

General

---

# Routing Rules

Grammar

↓

Grammar Agent

Vocabulary

↓

Vocabulary Agent

Homework

↓

Homework Agent

Writing

↓

Writing Agent

Unknown

↓

General Lesson Agent

---

# Fallback

Primary Agent

↓

General Agent

↓

Cached Response

↓

Graceful Error

---

# Monitoring

Latency

Failures

Routing Accuracy

Provider Usage

---

# Acceptance Criteria

✓ Correct Routing

✓ Fast

✓ Scalable

✓ Observable

---

# Final Rule

The Orchestrator is the single decision-making layer for every AI request.

End of Document.