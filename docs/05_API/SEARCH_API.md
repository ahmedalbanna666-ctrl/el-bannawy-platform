# SEARCH_API.md

# El-bannawy Platform
## Global Search API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Global Search Module.

The Search API provides a unified search experience across the entire El-bannawy Platform.

Students, teachers and administrators can quickly find educational content, users and platform resources according to their permissions.

The Search API supports both keyword-based and semantic search.

---

# Base Endpoint

/api/v1/search

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Teacher
- Secretary
- Support
- Administrator

Search results depend on user permissions.

---

# ==========================
# GLOBAL SEARCH
# ==========================

GET

/search

Description

Search across the entire platform.

Query Parameters

- q
- page
- limit
- type

Example

```text
GET /search?q=present simple
```

Response

```json
{
  "results": [
    {
      "id": "",
      "type": "lesson",
      "title": "Present Simple",
      "description": "",
      "url": ""
    }
  ]
}
```

---

# ==========================
# LESSON SEARCH
# ==========================

GET

/search/lessons

Description

Search lessons.

Supported Filters

- Grade
- Unit
- Lesson
- Status

---

# ==========================
# VOCABULARY SEARCH
# ==========================

GET

/search/vocabulary

Description

Search vocabulary.

Supports

- Word
- Meaning
- Definition

---

# ==========================
# STORY SEARCH
# ==========================

GET

/search/story

Description

Search story lessons.

---

# ==========================
# HOMEWORK SEARCH
# ==========================

GET

/search/homework

Teacher

Administrator

Search homework.

---

# ==========================
# QUIZ SEARCH
# ==========================

GET

/search/quizzes

Teacher

Administrator

Search quizzes.

---

# ==========================
# USER SEARCH
# ==========================

GET

/search/users

Teacher

Secretary

Administrator

Search users.

Supported Filters

- Name
- Mobile
- Student ID
- Teacher

---

# ==========================
# AI SEARCH
# ==========================

GET

/search/ai

Administrator

Search AI Knowledge Base.

Uses

Semantic Search

Vector Search

RAG

---

# ==========================
# FILE SEARCH
# ==========================

GET

/search/files

Search

- PDFs
- Documents
- Worksheets

---

# ==========================
# SUGGESTIONS
# ==========================

GET

/search/suggestions

Description

Return search suggestions.

Based on

- Search History
- Popular Searches
- Current Lesson

---

# ==========================
# RECENT SEARCHES
# ==========================

GET

/search/recent

Return user's recent searches.

---

DELETE

/search/recent

Clear search history.

---

# ==========================
# TRENDING SEARCHES
# ==========================

GET

/search/trending

Return trending educational searches.

---

# ==========================
# VALIDATION
# ==========================

Validate

- Search Length
- Supported Filters
- User Authorization
- Pagination

---

# ==========================
# SECURITY
# ==========================

Students may search only:

Assigned educational content.

Teachers may search only:

Assigned educational content and students.

Administrators

Full Access.

---

# ==========================
# PAGINATION
# ==========================

Supported

- page
- limit
- sort
- order

Maximum

100

---

# ==========================
# STATUS CODES
# ==========================

200 OK

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Keyword Search

<200ms

Semantic Search

<500ms

Suggestions

<100ms

Trending

<200ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Search Executed
- Search Filters Used
- Search Type
- Search Failures

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Global search works.

✓ Lesson search works.

✓ Vocabulary search works.

✓ User search works.

✓ File search works.

✓ Suggestions work.

✓ Semantic search works.

✓ Authorization works.

---

# Final Rule

The Search API must provide fast, accurate and permission-aware search results across the El-bannawy Platform.

Users must only see content they are authorized to access, while search relevance should continuously improve based on educational context and user behavior.

End of Document.