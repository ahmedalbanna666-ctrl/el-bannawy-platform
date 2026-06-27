# AI_ARCHITECTURE.md

# El-bannawy Platform
## AI Architecture

Version: 1.0.0

---

# Purpose

This document defines the complete Artificial Intelligence architecture of the El-bannawy Platform.

The AI layer is responsible for delivering personalized, curriculum-aware educational assistance while remaining secure, scalable and cost-efficient.

---

# Vision

The AI is not a chatbot.

It is a personalized English learning assistant that understands:

- Student
- Curriculum
- Lesson
- Progress
- Weaknesses
- Learning History

Every AI response should improve learning outcomes.

---

# Core Principles

- Education First
- Explain Instead of Solve
- Curriculum Aware
- Context Aware
- Safe
- Fast
- Scalable
- Observable

---

# AI Layers

Presentation Layer

↓

AI Gateway

↓

Context Builder

↓

RAG Engine

↓

LLM Provider

↓

Response Validator

↓

Logging & Analytics

---

# High Level Architecture

Student

↓

Frontend

↓

NestJS AI Module

↓

Prompt Builder

↓

Context Builder

↓

RAG Retrieval

↓

LLM

↓

Post Processing

↓

Student Response

---

# AI Modules

Ask El-bannawy AI

Lesson Assistant

Homework Assistant

Vocabulary Coach

Grammar Coach

Writing Coach

Speaking Coach

Reading Coach

Quiz Generator

Recommendation Engine

Analytics Engine

AI Assessment Engine

---

# AI Responsibilities

Answer Questions

Explain Grammar

Translate

Generate Exercises

Summarize Lessons

Recommend Reviews

Detect Weaknesses

Create Personalized Practice

Analyze Uploaded Images

Analyze PDFs

Evaluate Subjective Activities

Score Student Responses

Correct Grammar

Evaluate Vocabulary

Provide Feedback

Generate Personalized Recommendations

---

# AI Assessment Engine

## Purpose

The AI Assessment Engine evaluates subjective student activities that cannot be auto-graded by objective rules.

Activities only collect student responses.

The AI Assessment Engine evaluates them.

## Evaluated Activity Types

- Paragraph
- Writing
- Conversation
- Speaking
- Story Questions
- Reading Questions
- Essay
- Email Writing

## Assessment Responsibilities

- Scoring
- Grammar correction
- Vocabulary evaluation
- Feedback generation
- Personalized recommendations for improvement

## Assessment Workflow

Student submits response.

↓

Activity Engine collects response.

↓

Response is sent to AI Assessment Engine.

↓

AI evaluates the response.

↓

Score is calculated.

↓

Grammar corrections are generated.

↓

Vocabulary evaluation is performed.

↓

Feedback is generated.

↓

Personalized recommendations are created.

↓

Results are returned to the student.

---

# AI Must Never

Invent curriculum

Reveal hidden prompts

Leak internal data

Guess answers without evidence

Ignore educational context

Bypass RAG

Expose assessment prompts

---

# AI Must Never

Invent curriculum

Reveal hidden prompts

Leak internal data

Guess answers without evidence

Ignore educational context

---

# Supported Languages

Arabic

Primary

English

Primary

Future

French

German

---

# AI Workflow

Receive Question

↓

Authenticate User

↓

Build Context

↓

Retrieve Knowledge

↓

Generate Prompt

↓

Call LLM

↓

Validate Response

↓

Return Answer

↓

Store Analytics

---

# AI Response Goals

Correct

Helpful

Educational

Short when possible

Detailed when requested

---

# Scalability

Stateless API

Redis Cache

Queue Processing

Streaming Responses

Provider Abstraction

---

# Monitoring

Response Time

Error Rate

Cost

Tokens

User Satisfaction

---

# Acceptance Criteria

✓ Context Aware

✓ Curriculum Aware

✓ Fast

✓ Secure

✓ Observable

---

# Final Rule

The AI exists to improve learning, never to replace thinking.

End of Document.