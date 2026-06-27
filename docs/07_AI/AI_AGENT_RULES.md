# AI_AGENT_RULES.md

# El-bannawy Platform
## AI Development Rules

Version: 1.0.0

---

# Purpose

This document defines the mandatory operating rules for every AI Coding Agent working on the El-bannawy Platform.

These rules are mandatory.

Failure to follow them is considered an implementation error.

---

# Rule Priority

When multiple sources provide instructions, use the following priority:

1. AI_AGENT_RULES.md
2. AGENTS.md
3. Documentation
4. Existing Code
5. AI Knowledge

Never reverse this order.

---

# AI Responsibilities

The AI Agent is responsible for:

- Reading documentation before coding.
- Following documented architecture.
- Respecting business rules.
- Producing production-ready code.
- Writing maintainable code.
- Keeping consistency across the repository.

---

# AI Must Never

The AI Agent MUST NEVER:

- Guess undocumented business logic.
- Invent requirements.
- Rename documented entities.
- Ignore documentation.
- Skip validation.
- Generate placeholder code.
- Create temporary implementations.
- Modify architecture.
- Change folder structure.
- Replace documented technologies.
- Ignore coding standards.
- Remove existing features.
- Generate duplicate code.
- Add undocumented dependencies.
- Ignore security practices.
- Ignore performance considerations.

---

# Documentation Rules

Documentation is always the single source of truth.

If documentation conflicts with generated code:

Documentation wins.

If documentation is incomplete:

STOP.

Ask for clarification.

Do not guess.

---

# Code Generation Rules

Every generated code must be:

- Production Ready
- Strongly Typed
- Tested
- Maintainable
- Reusable
- Modular
- Readable
- Consistent

Never generate experimental code.

Never generate demo code.

Never generate fake implementations.

---

# TypeScript Rules

Always use:

- TypeScript Strict Mode

Never use:

- any
- @ts-ignore
- @ts-expect-error
- eslint-disable

Unless explicitly documented.

Always create explicit types.

Always prefer interfaces for public contracts.

Always use readonly whenever possible.

---

# Architecture Rules

Always respect:

- Modular Monolith
- Clean Architecture
- Domain Driven Design
- SOLID Principles
- Repository Pattern
- Dependency Injection

No shortcuts are allowed.

---

# Business Rules

Business Rules are immutable.

Never change:

- XP Logic
- Coins Logic
- Lesson Flow
- Quiz Flow
- Homework Flow
- Referral Logic
- AI Logic
- Notification Logic

Without documentation approval.

---

# Naming Rules

Never invent names.

Always use documented names.

Example:

Correct:

Lesson

Incorrect:

Lecture

StudyLesson

VideoLesson

---

# UI Rules

Always follow:

- Mobile First
- Responsive Design
- RTL Support
- Dark Mode
- Light Mode
- Glassmorphism
- Accessibility

Never create inconsistent UI.

Never duplicate components.

---

# Backend Rules

Always:

- Validate input.
- Validate output.
- Use DTOs.
- Use Services.
- Use Repositories.
- Use Dependency Injection.
- Handle exceptions correctly.

Never place business logic inside controllers.

---

# Database Rules

Never:

- Change schema.
- Rename entities.
- Remove constraints.
- Remove indexes.

Without documentation approval.

Always:

- Respect foreign keys.
- Respect naming conventions.
- Respect relationships.

---

# API Rules

Every endpoint must include:

- Validation
- Authentication
- Authorization
- Error Handling
- Typed Request
- Typed Response
- Proper HTTP Status Codes

---

# Security Rules

Always:

- Hash passwords.
- Validate JWT.
- Sanitize input.
- Validate permissions.
- Protect private routes.

Never trust client input.

---

# Performance Rules

Always:

- Optimize queries.
- Use pagination.
- Prevent N+1 queries.
- Cache documented operations.
- Lazy load heavy resources.

---

# Testing Rules

Every completed feature must include:

- Unit Tests
- Integration Tests
- End-to-End Tests (when applicable)

A feature is not complete without tests.

---

# Git Rules

Generate commits that are:

- Small
- Atomic
- Descriptive

Never mix unrelated changes.

---

# Decision Policy

When documentation is unclear:

STOP.

Do not continue.

Ask for clarification.

Never make assumptions.

---

# Completion Checklist

Before completing any task:

- Documentation reviewed.
- Architecture respected.
- Business rules respected.
- Naming respected.
- Tests passing.
- Lint passing.
- TypeScript passing.
- Production-ready code generated.

---

# Final Rule

The AI Agent is an implementation assistant.

The project documentation is the architect.

Documentation always has the highest authority.

End of Document.