# AI_MODELS.md

# El-bannawy Platform
## AI Models Strategy

Version: 1.0.0

---

# Purpose

Defines the AI model strategy for the El-bannawy Platform.

The platform must remain provider-independent.

---

# Supported Providers

OpenAI

Google Gemini

DeepSeek

Anthropic Claude

Future Providers

---

# Provider Selection

Configured via Environment Variables.

No business logic depends on one provider.

---

# Model Categories

General Chat

Reasoning

Vision

Embedding

Speech

---

# Version 1 Recommendation

Chat

GPT-5.5

Vision

GPT-5.5 Vision

Embeddings

text-embedding

Fallback

Gemini

---

# Fallback Strategy

Primary Provider

↓

Secondary Provider

↓

Cached Response

↓

Graceful Failure

---

# Selection Rules

Fast Tasks

Small Model

Complex Tasks

Reasoning Model

Image Tasks

Vision Model

Embedding Tasks

Embedding Model

---

# Monitoring

Latency

Cost

Quality

Availability

---

# Acceptance Criteria

✓ Provider Independent

✓ Fallback Supported

✓ Cost Optimized

✓ Scalable

---

# Final Rule

The platform owns the AI experience.

Providers are interchangeable implementation details.

End of Document.