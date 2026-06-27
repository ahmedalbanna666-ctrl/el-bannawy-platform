# VOCABULARY_API.md

# El-bannawy Platform
## Vocabulary API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Vocabulary Module.

The Vocabulary API is responsible for:

- Retrieving lesson vocabulary
- Tracking vocabulary progress
- Managing favorite words
- Managing pronunciation
- Recording vocabulary learning status
- Supporting vocabulary practice

---

# Base Endpoint

/api/v1/vocabulary

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
# VOCABULARY LIST
# ==========================

GET

/vocabulary/lesson/{lessonId}

Description

Return all vocabulary words for a lesson.

Response

```json
{
  "lessonId": "",
  "words": [
    {
      "id": "",
      "word": "",
      "pronunciation": "",
      "meaning": "",
      "definition": "",
      "example": "",
      "audioUrl": "",
      "imageUrl": "",
      "isFavorite": false,
      "isLearned": false
    }
  ]
}
```

---

# ==========================
# SINGLE WORD
# ==========================

GET

/vocabulary/{wordId}

Description

Return full vocabulary details.

Includes

- Word
- Pronunciation
- Meaning
- Definition
- Example
- Audio
- Image

---

# ==========================
# MARK AS LEARNED
# ==========================

PATCH

/vocabulary/{wordId}/learned

Description

Mark vocabulary word as learned.

Response

```json
{
    "success": true
}
```

---

# ==========================
# FAVORITES
# ==========================

POST

/vocabulary/{wordId}/favorite

Description

Add word to favorites.

---

DELETE

/vocabulary/{wordId}/favorite

Description

Remove from favorites.

---

GET

/vocabulary/favorites

Description

Return student's favorite vocabulary.

---

# ==========================
# VOCABULARY PROGRESS
# ==========================

GET

/vocabulary/progress/{lessonId}

Description

Return vocabulary learning progress.

Response

```json
{
    "lessonId":"",
    "learnedWords":12,
    "totalWords":20,
    "progress":60
}
```

---

# ==========================
# PRACTICE MODE
# ==========================

GET

/vocabulary/practice/{lessonId}

Description

Generate vocabulary practice session.

Supported Types

- Flashcards
- Matching
- Multiple Choice
- Listening

---

POST

/vocabulary/practice/submit

Description

Submit vocabulary practice answers.

Response

```json
{
    "score":90,
    "correctAnswers":18,
    "wrongAnswers":2
}
```

---

# ==========================
# SEARCH
# ==========================

GET

/vocabulary/search

Parameters

- search
- lesson
- unit

Searches

- Word
- Meaning
- Definition

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/vocabulary

Teacher

Administrator

Create vocabulary word.

---

PATCH

/vocabulary/{wordId}

Update vocabulary.

---

DELETE

/vocabulary/{wordId}

Soft Delete.

---

POST

/vocabulary/import

Bulk Import

CSV

Excel

Future

JSON

---

# ==========================
# AUDIO
# ==========================

POST

/vocabulary/{wordId}/audio

Upload pronunciation.

Teacher

Administrator

---

# ==========================
# IMAGES
# ==========================

POST

/vocabulary/{wordId}/image

Upload vocabulary image.

---

# ==========================
# ANALYTICS
# ==========================

GET

/vocabulary/analytics/{lessonId}

Teacher

Administrator

Return

- Most Difficult Words
- Most Reviewed Words
- Learning Progress
- Practice Accuracy

---

# ==========================
# VALIDATION
# ==========================

Validate

- Lesson Exists
- Vocabulary Exists
- Student Enrollment
- Audio Format
- Image Format

---

# ==========================
# SECURITY
# ==========================

Students may access only:

Vocabulary assigned to their educational grade.

Teachers may modify only assigned educational content.

---

# ==========================
# PAGINATION
# ==========================

Supported

page

limit

sort

order

Maximum

100

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

422 Validation Error

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Vocabulary List

<200ms

Word Details

<100ms

Progress Update

<100ms

Search

<150ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Word Created
- Word Updated
- Word Deleted
- Audio Uploaded
- Image Uploaded
- Vocabulary Imported

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Vocabulary list loads.

✓ Word details load.

✓ Favorites work.

✓ Mark as learned works.

✓ Practice mode works.

✓ Progress tracking works.

✓ Search works.

✓ Teacher management works.

✓ Analytics work.

---

# Final Rule

The Vocabulary API must provide a fast, reliable and engaging learning experience while maintaining accurate student progress and complete synchronization with the Lesson Module.

End of Document.