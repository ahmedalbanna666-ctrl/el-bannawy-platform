# PROJECT_CONVENTIONS.md

# El-bannawy Platform
## Project Conventions

Version: 1.0.0

---

# Purpose

This document defines the mandatory project-wide conventions used throughout the El-bannawy Platform.

Every AI Agent and developer must follow these conventions.

These conventions are not optional.

---

# Repository Convention

Repository Name

el-bannawy-platform

Never rename the repository.

---

# Naming Convention

Always use English.

Never mix Arabic and English in identifiers.

Correct

Student

Lesson

Homework

Quiz

Vocabulary

Incorrect

lesson_data

studentInfoData

videoLessonInfo

---

# File Naming

Use lowercase.

Separate words using hyphens.

Correct

student-profile.tsx

lesson-card.tsx

video-player.service.ts

Incorrect

StudentProfile.tsx

LessonCard.tsx

VideoPlayer.ts

---

# Folder Naming

Use lowercase.

Use hyphens only.

Correct

student-profile

lesson-management

video-engine

Incorrect

StudentProfile

LessonManagement

VideoEngine

---

# Component Naming

React Components use PascalCase.

Example

StudentCard

LessonCard

VideoPlayer

HomeworkDialog

---

# Hook Naming

Always start with

use

Example

useStudent

useLesson

useCoins

useVideoPlayer

---

# Store Naming

Always end with

Store

Example

studentStore

lessonStore

themeStore

authStore

---

# Service Naming

Always end with

Service

Example

StudentService

VideoService

HomeworkService

QuizService

---

# Controller Naming

Always end with

Controller

Example

StudentController

LessonController

QuizController

---

# Module Naming

Always end with

Module

Example

StudentModule

LessonModule

AuthenticationModule

---

# DTO Naming

Always end with

Dto

Example

CreateLessonDto

UpdateStudentDto

LoginDto

---

# Entity Naming

Always end with

Entity

Example

LessonEntity

StudentEntity

QuizEntity

---

# Interface Naming

Always start with I

Example

IStudent

ILesson

IHomework

---

# Enum Naming

Always end with

Enum

Example

UserRoleEnum

LessonStatusEnum

NotificationTypeEnum

---

# Constant Naming

Use UPPER_SNAKE_CASE

Example

MAX_UPLOAD_SIZE

DEFAULT_LANGUAGE

JWT_EXPIRES_IN

---

# Environment Variables

Use UPPER_SNAKE_CASE

Example

DATABASE_URL

JWT_SECRET

OPENAI_API_KEY

REDIS_HOST

---

# API Convention

Always use plural resources.

Correct

/api/students

/api/lessons

/api/units

Incorrect

/api/student

/api/getLessons

/api/createLesson

---

# HTTP Methods

GET

Retrieve data

POST

Create resources

PUT

Replace resources

PATCH

Partial update

DELETE

Remove resources

---

# Response Convention

Every successful response must include

success

data

message

timestamp

Example

{
    "success": true,
    "message": "Lesson created successfully.",
    "data": {},
    "timestamp": ""
}

---

# Error Response Convention

Every error response must include

success

error

message

statusCode

timestamp

---

# Database Convention

Use snake_case.

Example

student_id

lesson_id

created_at

updated_at

Never use camelCase inside the database.

---

# Timestamp Convention

Every table must contain

created_at

updated_at

Optionally

deleted_at

for soft delete.

---

# Primary Key Convention

Every table uses

id

UUID

Never use incremental IDs unless documented.

---

# Code Formatting

Always follow

Prettier

Never manually format code differently.

---

# Import Convention

Order

1. Node modules

2. Internal packages

3. Local modules

4. Relative files

---

# Comments

Write comments only when necessary.

Never explain obvious code.

Prefer self-documenting code.

---

# Function Rules

Each function must have one responsibility.

Avoid functions longer than 50 lines whenever possible.

---

# Class Rules

One class

One responsibility

Follow SOLID principles.

---

# Dependency Rules

Never introduce a new dependency unless:

- Approved
- Documented
- Necessary

---

# Logging

Never use console.log in production.

Use the official logging service.

---

# Final Convention

Consistency is more important than personal preference.

Every new feature must follow these conventions without exception.

End of Document.