# AGENTS.md

# El-bannawy Platform
## AI Development Operating System (AI-DOS)

Version: 2.0.0

Status: ACTIVE

Last Updated: 2026

---

# Purpose

This document defines the operational rules for every AI Coding Agent working on the El-bannawy Platform.

It is the first document every AI agent and every engineer must read before implementing, modifying or deleting any code.

This document applies to:

- Claude Code
- OpenAI Codex
- Cursor
- Gemini CLI
- Windsurf
- Cline
- Roo Code
- GitHub Copilot
- Future AI Development Agents

The AI Agent is an implementation assistant.

The documentation is the architect.

---

# Repository Identity

Project Name

El-bannawy Platform

Product

Enterprise AI-Powered English Learning Platform

Architecture

Documentation Driven Development

AI First

Modular Monolith

Domain Driven Design

Feature Based Architecture

Clean Architecture

Supported Platforms

- Web

- Android

- iOS

- Desktop

---

# Mission

Your mission is NOT to redesign the platform.

Your mission is to implement the documented architecture exactly as specified.

Always optimize for:

Maintainability

Scalability

Security

Performance

Readability

Long-term evolution

Never optimize for writing code quickly.

---

# Project Vision

Build the most advanced AI-powered English learning platform in the Arab world.

Primary Objectives

✓ AI Assisted Learning

✓ Personalized Education

✓ High Performance

✓ Enterprise Quality

✓ Long-Term Maintainability

✓ Production Readiness

---

# Source of Truth

The documentation defines the project.

If code conflicts with documentation,

the documentation wins.

Priority Order

1.

MASTER_EXECUTION_PLAN.md

2.

README.md

3.

PROJECT_REFERENCE.md

4.

Architecture Documentation

5.

Database Documentation

6.

Backend Documentation

7.

Security Documentation

8.

API Documentation

9.

UI Documentation

10.

AI Documentation

11.

DevOps Documentation

12.

Testing Documentation

13.

Deployment Documentation

---

# Documentation Reading Order

Every new developer or AI Agent must read documents in this order.

MASTER_EXECUTION_PLAN.md

↓

AGENTS.md

↓

README.md

↓

PROJECT_REFERENCE.md

↓

Architecture

↓

Database

↓

Backend

↓

Security

↓

API

↓

UI

↓

AI

↓

DevOps

↓

Testing

↓

Deployment

Never skip this order.

---

# Current Project Phase

Current Status

Documentation

Completed

Current Phase

Project Bootstrap

Implementation

Not Started

Next Target

Create Project Foundation

Do not start implementing business modules before the bootstrap phase is completed.

---

# Development Phases

Phase 1

Project Bootstrap

↓

Phase 2

Design System

↓

Phase 3

Authentication

↓

Phase 4

Core Dashboard

↓

Phase 5

Lesson Engine

↓

Phase 6

Activity Engine

↓

Phase 7

Homework

↓

Phase 8

Quiz Engine

↓

Phase 9

Reports

↓

Phase 10

Payments

↓

Phase 11

Notifications

↓

Phase 12

AI Integration

↓

Phase 13

Optimization

↓

Phase 14

Testing

↓

Phase 15

Production Deployment

Never execute phases out of order.

---

# Before Writing Code

Before writing any code,

always execute this checklist.

Read Documentation

↓

Understand Requirements

↓

Understand Dependencies

↓

Understand Existing Architecture

↓

Review Folder Structure

↓

Review Related Modules

↓

Plan Implementation

↓

Implement

↓

Test

↓

Update Documentation

↓

Commit

Skipping any step is prohibited.

---

# Highest Priority Rule

If documentation is incomplete,

ambiguous,

or contradictory,

STOP.

Do not guess.

Do not invent.

Request clarification.

Wrong implementation is more expensive than delayed implementation.

---

# Never Assume

Never invent

Business Rules

API Endpoints

Database Tables

Folder Structures

Permissions

Authentication Logic

User Flows

Naming Conventions

Validation Rules

Always verify against documentation first.

---

# Project Principles

Documentation Driven Development

Architecture Before Code

Security First

AI First

Accessibility First

Performance First

Mobile First

Dark Mode First

Scalability First

Maintainability First

Consistency Over Creativity

The project values predictable engineering over clever implementations.
# Technology Stack

## Frontend

Framework

Next.js 15 (App Router)

Language

TypeScript

State Management

Zustand

Server State

TanStack Query

Styling

TailwindCSS

Icons

Lucide Icons

Forms

React Hook Form

Validation

Zod

Theme

Dark / Light

RTL Support

Required

---

## Backend

Framework

NestJS

Language

TypeScript

Architecture

Modular

REST API

Required

Authentication

JWT

Authorization

RBAC

Validation

class-validator

ORM

Prisma

Database

PostgreSQL

Queue

BullMQ

Cache

Redis

Storage

Cloudflare R2 (Future)

---

## Artificial Intelligence

RAG

Required

Embeddings

pgvector

Provider Abstraction

Required

Streaming

Enabled

Prompt Engine

Required

Context Engine

Required

Memory

Supported

Recommendation Engine

Supported

Response Validation

Required

---

# Engineering Rules

Every implementation must be

Readable

Predictable

Reusable

Scalable

Documented

Testable

Avoid unnecessary abstractions.

Prefer explicit code over clever code.

Small functions are preferred.

Single responsibility is mandatory.

---

# TypeScript Rules

TypeScript Only.

JavaScript is forbidden.

Strict Mode must remain enabled.

Never use

any

Prefer

unknown

Generics

Interfaces

Readonly

Discriminated Unions

Utility Types

Enable exhaustive checking.

Avoid

type assertions

unless absolutely necessary.

Every exported function requires explicit return types.

---

# Naming Convention

Folders

kebab-case

Files

kebab-case

React Components

PascalCase

Interfaces

PascalCase

Variables

camelCase

Functions

camelCase

Enums

PascalCase

Constants

SCREAMING_SNAKE_CASE

Database Tables

snake_case

Prisma Models

PascalCase

API Routes

kebab-case

---

# Folder Rules

Never create random folders.

Never create duplicated modules.

Always follow documented architecture.

Maximum folder nesting

4 levels.

Every feature belongs to exactly one module.

Shared code belongs inside packages/shared.

---

# Frontend Rules

Pages remain thin.

Business logic belongs inside hooks or services.

Never fetch directly inside UI components.

Every component supports

Dark Mode

Light Mode

RTL

Accessibility

Responsive Layout

Loading State

Error State

Empty State

Use Design Tokens only.

Never hardcode colors.

Never hardcode spacing.

Never duplicate UI components.

---

# Backend Rules

Controllers

Receive requests only.

Services

Business Logic only.

Repositories

Database access only.

DTOs

Validation only.

Guards

Authentication

Authorization

Interceptors

Logging

Caching

Transformation

Never place business logic inside controllers.

Never access Prisma directly from controllers.

---

# Database Rules

Prisma is mandatory.

Never bypass Prisma.

Never edit production database manually.

Every schema change requires

Migration

Documentation Update

Testing

Review

Indexes must be documented.

Soft delete preferred when appropriate.

Transactions required for multi-step operations.

---

# API Rules

REST API

Versioned

Consistent

Documented

Swagger Required

Every endpoint must include

Validation

Authentication

Authorization

Error Responses

Success Responses

Pagination

when required.

Standard Response Format

Success

Data

Meta

Error

Timestamp

Request ID

---

# AI Rules

Every AI request must follow

Authentication

↓

Context Builder

↓

Memory

↓

RAG

↓

Prompt Builder

↓

LLM

↓

Response Validation

↓

Logging

↓

Analytics

Never bypass RAG.

Never expose prompts.

Never expose internal documentation.

Never expose API Keys.

Never generate undocumented curriculum.

Never answer outside retrieved educational context.

---

# Security Rules

Validate every request.

Authorize every request.

Sanitize every input.

Escape every output where required.

Hash passwords.

Encrypt secrets.

Never expose stack traces.

Never trust client data.

Never log

Passwords

Tokens

Secrets

Payment Data

Personal Information

Follow least privilege everywhere.

---

# Performance Rules

Avoid unnecessary rendering.

Memoize expensive calculations.

Lazy load large components.

Optimize images.

Use caching whenever possible.

Batch database operations.

Avoid N+1 queries.

Optimize Prisma queries.

Monitor AI token usage.

Target Metrics

API

<300ms

Dashboard

<2 seconds

Database

<100ms

AI

<3 seconds
# Testing Rules

Every feature must include appropriate tests.

Required Tests

Unit Tests

Integration Tests

End-to-End Tests (when applicable)

Accessibility Tests

Regression Tests

Before every commit verify

✓ TypeScript

✓ ESLint

✓ Build

✓ Tests

Never merge failing tests.

Coverage Goals

Business Logic

90%

Critical Services

95%

UI Components

80%

---

# Documentation Rules

Documentation is part of the software.

Every architectural change requires:

Documentation Update

↓

Implementation

↓

Testing

↓

Review

↓

Merge

Never allow documentation to become outdated.

Every new feature must reference its related documentation.

---

# Git Workflow

Branch Strategy

main

Production

develop

Integration

feature/*

New Features

hotfix/*

Critical Production Fixes

release/*

Release Preparation

Workflow

Create Feature Branch

↓

Implement Feature

↓

Run Tests

↓

Update Documentation

↓

Create Pull Request

↓

Code Review

↓

CI Validation

↓

Merge

Never commit directly to main.

---

# Commit Convention

Use Conventional Commits.

Examples

feat(auth): add refresh token

fix(api): resolve pagination bug

docs(ai): update RAG architecture

refactor(ui): simplify lesson card

test(homework): add integration tests

---

# Pull Request Checklist

Every Pull Request must satisfy

✓ Documentation Updated

✓ TypeScript Passed

✓ ESLint Passed

✓ Build Successful

✓ Tests Passed

✓ Responsive

✓ Dark Mode Supported

✓ RTL Supported

✓ Accessibility Verified

✓ No Duplicate Code

✓ No Console Logs

✓ No Dead Code

✓ No Secrets

---

# Quality Gates

Before merging

Code Review

↓

Architecture Validation

↓

Security Review

↓

Performance Validation

↓

Testing

↓

Documentation Review

↓

CI Passed

↓

Merge

Failure at any gate blocks the merge.

---

# Dependency Rules

Before installing a package ask

Is it already available?

Can existing code solve the problem?

Is the dependency maintained?

Is it production ready?

Is it necessary?

Avoid dependency bloat.

---

# Code Review Principles

Review for

Correctness

Readability

Maintainability

Performance

Security

Scalability

Consistency

Do not approve code simply because it works.

---

# Refactoring Rules

Refactor only when

Improves readability

Improves maintainability

Improves performance

Removes duplication

Never refactor unrelated code inside the same Pull Request.

---

# Logging Rules

Use structured logging.

Every important operation should include

Timestamp

Request ID

User ID

Operation

Duration

Status

Never log

Passwords

JWT Tokens

Secrets

Private Data

---

# Error Handling

Errors should be

Predictable

Documented

Actionable

User Friendly

Never expose

Stack Traces

SQL Errors

Internal Exceptions

Environment Variables

---

# AI Workflow

Every AI Agent should always follow this workflow.

Read

↓

Understand

↓

Plan

↓

Check Dependencies

↓

Implement

↓

Validate

↓

Test

↓

Update Documentation

↓

Commit

↓

Proceed

Never skip planning.

Never skip validation.

Never skip documentation.

---

# Forbidden Actions

Never

Invent Architecture

Invent Business Logic

Invent Database Tables

Invent APIs

Invent Folder Structures

Rename Documented Modules

Ignore Existing Components

Duplicate Logic

Duplicate Components

Bypass Validation

Disable Authentication

Disable Authorization

Expose Secrets

Commit API Keys

Ignore Documentation

Skip Tests

Skip Code Review

Hardcode Configuration

Hardcode Secrets

Hardcode Colors

Hardcode Business Rules

Guess Missing Requirements

---

# When You Are Unsure

Stop immediately.

Read the documentation again.

If the answer is still unclear,

request clarification.

Never continue based on assumptions.

---

# Expected Behaviour

Think before coding.

Read before implementing.

Understand before modifying.

Reuse before creating.

Optimize before scaling.

Document before merging.

The goal is not writing code.

The goal is building a maintainable platform.

---

# Definition of Success

Success is achieved when

The implementation matches the documented architecture.

The code is maintainable.

The feature is fully tested.

The documentation is updated.

The implementation is production-ready.

The system remains scalable.

The platform remains easy to evolve.

---

# Living Document Policy

This document is a Living Document.

Whenever

Architecture changes

Engineering rules change

Technology changes

Folder structure changes

Development workflow changes

This document must be updated immediately.

---

# Final Rule

The documentation defines the architecture.

The architecture defines the implementation.

The implementation must never redefine the architecture.

Read.

Understand.

Implement.

Validate.

Document.

Repeat.

---

# Autonomous Execution Policy

- Never stop between implementation tasks that belong to the same milestone.
- Continue automatically until the milestone is completely finished.
- Only stop if:
  - External credentials are required.
  - A business decision requires the project owner's input.
  - Documentation contains conflicting requirements.
  - An architectural blocker prevents implementation.
- After each milestone:
  - Run lint.
  - Run typecheck.
  - Run build.
  - Verify documentation compliance.
  - Produce a completion report.
- Never ask "Do you want me to continue?" after every phase.

---

# Scope Discipline

- Implement only the current milestone.
- Do not modify completed modules unless required by documentation.
- Do not introduce features outside the current milestone.
- Do not change business rules unless documentation is updated first.
- Keep implementation aligned with MASTER_EXECUTION_PLAN.md and AGENTS.md.

---
# Documentation First Policy

Before implementing any milestone:

1. Read all related documentation.
2. Detect any documentation conflicts.
3. Update documentation first if needed.
4. Only then start implementation.

Code must never become the source of truth.
Documentation is always the source of truth.

End of Document.