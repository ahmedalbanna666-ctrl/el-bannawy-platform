# El-bannawy Platform

> Next Generation AI-Powered English Learning Platform

Version: 1.0.0

---

# Welcome

Welcome to the official documentation of the El-bannawy Platform.

This repository contains the complete technical documentation required to design, develop, deploy and maintain the platform.

The documentation is intended for:

- Software Engineers
- AI Engineers
- Frontend Developers
- Backend Developers
- DevOps Engineers
- QA Engineers
- Product Managers
- Technical Writers
- AI Coding Agents

Every architectural decision in the platform is documented here.

---

# Vision

The El-bannawy Platform is an AI-powered educational ecosystem designed to provide a personalized English learning experience for Arabic-speaking students.

The platform combines:

- Interactive Lessons
- Recorded Videos
- Live Classes
- AI Tutoring
- Adaptive Learning
- Gamification
- Analytics

into one unified educational experience.

---

# Core Principles

Education First

AI Assists Learning

Mobile First

Dark Mode First

Accessibility First

Performance First

Security by Design

Scalable Architecture

Developer Experience

---

# Target Users

Students

Teachers

Parents (Future)

Secretaries

Support Team

Administrators

AI Services

---

# Technology Stack

## Frontend

Next.js 15

React

TypeScript

TailwindCSS

TanStack Query

Zustand

---

## Backend

NestJS

TypeScript

Prisma ORM

REST API

BullMQ

Redis

---

## Database

PostgreSQL

pgvector

Redis

---

## Artificial Intelligence

OpenAI

Google Gemini

DeepSeek

Claude

RAG

Vector Search

Embeddings

---

## Infrastructure

Docker

GitHub Actions

Nginx

Prometheus

Grafana

Loki

Cloudflare

---

# Project Architecture

Frontend

↓

API

↓

Business Layer

↓

Database

↓

AI Layer

↓

Infrastructure

Each layer is isolated.

---

# Documentation Structure

```
docs/

00_PROJECT_OVERVIEW/
01_ARCHITECTURE/
02_DATABASE/
03_BACKEND/
04_SECURITY/
05_API/
06_UI/
07_AI/
08_DEVOPS/
09_TESTING/
10_DEPLOYMENT/
11_APPENDICES/
```

---

# Reading Order

New developers should follow this order:

1.

Project Overview

↓

2.

Architecture

↓

3.

Database

↓

4.

Backend

↓

5.

Security

↓

6.

API

↓

7.

UI

↓

8.

AI

↓

9.

DevOps

↓

10.

Testing

↓

11.

Deployment

---

# Main Features

Authentication

Authorization

Student Dashboard

Teacher Dashboard

Administrator Dashboard

Secretary Dashboard

AI Assistant

Lessons

Homework

Quizzes

Vocabulary

Stories

Live Classes

Payments

XP

Coins

Achievements

Notifications

Reports

Analytics

Search

File Storage

Monitoring

Audit Logs

---

# Artificial Intelligence

The AI system includes:

Curriculum-Aware RAG

Prompt Engine

Memory

Recommendation Engine

Specialized Agents

Context Builder

Knowledge Base

Provider Abstraction

Streaming

Safety Validation

---

# Development Workflow

Task

↓

Feature Branch

↓

Development

↓

Tests

↓

Pull Request

↓

Review

↓

CI

↓

Deployment

---

# Code Standards

TypeScript Only

Strict Mode

No any

ESLint

Prettier

Feature-Based Architecture

Clean Code

SOLID Principles

---

# Quality Standards

Automated Testing

Security Scanning

Performance Monitoring

Accessibility

Documentation

Code Review

---

# Security

JWT Authentication

Role-Based Access Control

Encrypted Secrets

Rate Limiting

Audit Logs

OWASP Compliance

---

# Performance Goals

API

<300ms

AI

<3 Seconds

Dashboard

<2 Seconds

Database Queries

<100ms

---

# Scalability

Horizontal Scaling

Redis Cache

BullMQ Workers

Provider Abstraction

Object Storage

Stateless APIs

---

# Folder Structure

```
apps/

database/

docs/

packages/

scripts/

docker/

.github/
```

---

# Getting Started

Clone Repository

↓

Install Dependencies

↓

Configure Environment

↓

Run Database

↓

Run Redis

↓

Start Backend

↓

Start Frontend

↓

Open Browser

---

# Contribution Rules

Read Documentation First

Follow Coding Standards

Write Tests

Update Documentation

Pass CI

Request Review

---

# Documentation Rules

Every new module must include:

Purpose

Responsibilities

Architecture

Data Flow

Interfaces

Acceptance Criteria

Final Rule

---

# Release Strategy

Semantic Versioning

MAJOR.MINOR.PATCH

Example

1.0.0

---

# Long-Term Goals

AI Personalized Learning

Adaptive Curriculum

Voice Tutor

Speaking Evaluation

Parent Dashboard

Native Mobile Apps

Marketplace

Offline Learning

International Expansion

---

# Engineering Philosophy

Readable code is better than clever code.

Automation is better than manual work.

Documentation is part of the product.

Security is never optional.

Performance is a feature.

AI should assist teachers, not replace them.

Students should always remain the center of every technical decision.

---

# Final Notes

This repository represents the complete technical blueprint of the El-bannawy Platform.

Every subsystem—from authentication and curriculum management to AI orchestration and production deployment—has been documented to ensure consistency, maintainability and long-term scalability.

All future development must follow the architecture, standards and engineering practices defined throughout this documentation.

---

# License

Private Project

Copyright © El-bannawy Platform

All Rights Reserved.

---

# Final Rule

If any implementation conflicts with this documentation, the documentation must be updated first or the implementation must be revised.

The documentation is the single source of truth for the El-bannawy Platform.

End of Document.