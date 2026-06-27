# AI_CONTEXT_ENGINE.md

# El-bannawy Platform
## AI Context Engine

Version: 1.0.0

---

# Purpose

Defines how educational context is assembled before each AI request.

The Context Engine is responsible for giving the LLM only the information required to answer accurately.

---

# Context Sources

Student Profile

Current Lesson

Current Unit

Current Grade

Conversation History

AI Memory

RAG Results

Teacher Notes

Platform Settings

---

# Context Priority

1.

Current Lesson

2.

Current Question

3.

Retrieved Knowledge

4.

Student Progress

5.

Conversation History

6.

Long-Term Memory

---

# Context Rules

Only relevant information.

No duplicated context.

No unnecessary tokens.

---

# Compression

Long conversations are summarized.

Recent context has higher priority.

---

# Acceptance Criteria

✓ Minimal Tokens

✓ High Relevance

✓ Fast

✓ Maintainable

---

# Final Rule

Only send the minimum context required to maximize answer quality.

End of Document.