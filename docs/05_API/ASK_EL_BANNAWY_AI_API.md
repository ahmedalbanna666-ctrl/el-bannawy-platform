# ASK_EL_BANNAWY_AI_API.md

# El-bannawy Platform
## Ask El-bannawy AI API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Ask El-bannawy AI Module.

The AI API provides intelligent educational assistance using Retrieval-Augmented Generation (RAG) and approved educational resources.

The AI Assistant must always teach students instead of simply providing answers.

---

# Base Endpoint

/api/v1/ai

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Teacher
- Administrator

---

# ==========================
# START CONVERSATION
# ==========================

POST

/ai/conversations

Description

Create a new AI conversation.

Response

```json
{
  "conversationId": "",
  "createdAt": ""
}
```

---

# ==========================
# SEND MESSAGE
# ==========================

POST

/ai/chat

Description

Send a message to Ask El-bannawy AI.

Request

```json
{
  "conversationId": "",
  "message": "",
  "lessonId": "",
  "unitId": ""
}
```

Response

```json
{
  "reply": "",
  "suggestions": [],
  "relatedLessons": [],
  "relatedVocabulary": []
}
```

---

# ==========================
# CONVERSATION HISTORY
# ==========================

GET

/ai/conversations

Description

Return all conversations.

---

GET

/ai/conversations/{conversationId}

Description

Return complete conversation history.

---

DELETE

/ai/conversations/{conversationId}

Description

Archive conversation.

Soft Delete only.

---

# ==========================
# IMAGE ANALYSIS
# ==========================

POST

/ai/image

Description

Upload workbook or homework image.

Supported Formats

- JPG
- PNG
- WEBP

Maximum Size

10 MB

Response

```json
{
    "analysis":"",
    "answer":"",
    "recommendations":[]
}
```

---

# ==========================
# PDF ANALYSIS
# ==========================

POST

/ai/pdf

Description

Upload lesson PDF.

Supported

- PDF

Maximum Size

20 MB

Response

```json
{
    "summary":"",
    "answers":[]
}
```

---

# ==========================
# AI RECOMMENDATIONS
# ==========================

GET

/ai/recommendations

Description

Return personalized recommendations.

Examples

- Review Lesson 4
- Replay Interactive Video
- Practice Vocabulary
- Retry Homework

---

# ==========================
# LESSON CONTEXT
# ==========================

GET

/ai/context/{lessonId}

Description

Return educational context for AI.

Includes

- Lesson
- Vocabulary
- Homework
- Quiz
- Student Progress

Student does not call this endpoint directly.

Internal API.

---

# ==========================
# FAVORITE CONVERSATIONS
# ==========================

POST

/ai/conversations/{conversationId}/favorite

Mark conversation as favorite.

---

DELETE

/ai/conversations/{conversationId}/favorite

Remove favorite.

---

GET

/ai/favorites

Return favorite conversations.

---

# ==========================
# AI USAGE
# ==========================

GET

/ai/usage

Return

- Daily Messages
- Monthly Messages
- Remaining Quota

Future Version

Token usage.

---

# ==========================
# ADMIN CONFIGURATION
# ==========================

GET

/ai/settings

Administrator only.

---

PATCH

/ai/settings

Update AI configuration.

Examples

- Model
- Temperature
- Max Tokens
- Knowledge Sources

---

# ==========================
# RAG KNOWLEDGE
# ==========================

POST

/ai/rag/reindex

Administrator

Rebuild vector database.

---

POST

/ai/rag/upload

Upload educational documents.

Supported

- PDF
- DOCX
- Markdown

---

# ==========================
# ANALYTICS
# ==========================

GET

/ai/analytics

Teacher

Administrator

Return

- Daily Conversations
- Most Asked Questions
- Response Time
- Satisfaction Score
- AI Cost
- Knowledge Coverage

---

# ==========================
# VALIDATION
# ==========================

Validate

- Student Enrollment
- Conversation Exists
- File Type
- File Size
- Message Length

Reject:

- Empty Messages
- Unsupported Files

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Access other conversations
- View system prompts
- Access API Keys
- Access internal RAG documents

Teachers cannot view private student conversations.

All AI requests are logged.

---

# ==========================
# RATE LIMIT
# ==========================

Chat Requests

30 Requests / Minute

Image Analysis

10 Requests / Minute

PDF Analysis

5 Requests / Minute

---

# ==========================
# STATUS CODES
# ==========================

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

413 Payload Too Large

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Chat Response

<3 Seconds

Image Analysis

<5 Seconds

PDF Analysis

<8 Seconds

Recommendations

<1 Second

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Conversation Created
- Message Sent
- Image Uploaded
- PDF Uploaded
- Recommendation Generated
- AI Settings Updated
- RAG Reindexed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ AI conversations work.

✓ Chat responses work.

✓ Conversation history works.

✓ Image analysis works.

✓ PDF analysis works.

✓ Personalized recommendations work.

✓ RAG integration works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Ask El-bannawy AI API must always provide educational guidance based on approved curriculum content.

The AI must prioritize teaching concepts, encouraging understanding and guiding students toward independent learning rather than simply providing direct answers.

End of Document.