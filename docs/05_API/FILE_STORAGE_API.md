# FILE_STORAGE_API.md

# El-bannawy Platform
## File Storage API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the File Storage Module.

The File Storage API is responsible for securely uploading, storing, organizing, retrieving and deleting all digital assets used throughout the El-bannawy Platform.

This includes:

- Lesson PDFs
- Images
- Avatars
- Vocabulary Audio
- Educational Resources
- Homework Attachments
- AI Uploaded Files
- Story Assets

Video files are NOT uploaded directly.

All lesson videos are streamed from unlisted YouTube videos.

---

# Base Endpoint

/api/v1/storage

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

Access depends on file ownership and permissions.

---

# ==========================
# UPLOAD FILE
# ==========================

POST

/storage/upload

Description

Upload a file.

Supported Types

- PDF
- JPG
- PNG
- WEBP
- MP3
- WAV

Future

- DOCX
- PPTX
- ZIP

Response

```json
{
    "fileId":"",
    "url":"",
    "fileName":"",
    "size":512340,
    "mimeType":"application/pdf"
}
```

---

# ==========================
# DOWNLOAD FILE
# ==========================

GET

/storage/files/{fileId}

Description

Return file metadata.

---

GET

/storage/files/{fileId}/download

Description

Download file.

Authorization required.

---

# ==========================
# DELETE FILE
# ==========================

DELETE

/storage/files/{fileId}

Description

Soft delete file.

Only owner or administrator.

---

# ==========================
# FILE LIST
# ==========================

GET

/storage/files

Description

Return uploaded files.

Supported Filters

- File Type
- Module
- Uploaded By
- Date

---

# ==========================
# UPDATE FILE
# ==========================

PATCH

/storage/files/{fileId}

Description

Update metadata.

Editable

- File Name
- Description
- Tags

---

# ==========================
# LESSON FILES
# ==========================

GET

/storage/lesson/{lessonId}

Return lesson files.

Examples

- PDF

- Worksheet

- Grammar Notes

- Vocabulary Sheet

---

# ==========================
# VOCABULARY AUDIO
# ==========================

POST

/storage/vocabulary/audio

Upload pronunciation audio.

Teacher

Administrator

---

# ==========================
# PROFILE AVATAR
# ==========================

POST

/storage/avatar

Upload profile image.

Maximum Size

5 MB

---

# ==========================
# AI FILES
# ==========================

POST

/storage/ai

Upload AI analysis file.

Supported

- PDF

- JPG

- PNG

Maximum Size

20 MB

---

# ==========================
# BULK UPLOAD
# ==========================

POST

/storage/bulk

Upload multiple files.

Maximum Files

20

Maximum Total Size

200 MB

---

# ==========================
# SEARCH FILES
# ==========================

GET

/storage/search

Search by

- File Name

- Tags

- Lesson

- Module

---

# ==========================
# STORAGE USAGE
# ==========================

GET

/storage/usage

Return

```json
{
    "usedStorage":"2.4 GB",
    "availableStorage":"97.6 GB",
    "totalFiles":1542
}
```

Administrator only.

---

# ==========================
# FILE PERMISSIONS
# ==========================

GET

/storage/files/{fileId}/permissions

Return file permissions.

---

PATCH

/storage/files/{fileId}/permissions

Administrator

Update file permissions.

---

# ==========================
# VALIDATION
# ==========================

Validate

- File Type

- File Size

- Ownership

- Virus Scan

- Duplicate File

- Module Assignment

---

# ==========================
# SECURITY
# ==========================

Every uploaded file must:

- Pass virus scanning

- Be stored securely

- Use randomized file names

- Be protected by access control

Private files must never be publicly accessible.

---

# ==========================
# RATE LIMIT
# ==========================

Upload

20 Requests / Minute

Download

100 Requests / Minute

Search

60 Requests / Minute

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

415 Unsupported Media Type

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

File Upload

<3 Seconds

Metadata Retrieval

<100ms

Search

<200ms

Download Initialization

<300ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- File Uploaded

- File Downloaded

- File Updated

- File Deleted

- Permission Changed

- Bulk Upload Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ File upload works.

✓ File download works.

✓ File deletion works.

✓ Lesson files work.

✓ Avatar upload works.

✓ AI uploads work.

✓ Search works.

✓ Permission management works.

✓ Authorization works.

---

# Final Rule

The File Storage API is the central repository for all platform assets.

Every file must be securely stored, permission-controlled, traceable and linked to its corresponding educational or administrative resource.

End of Document.