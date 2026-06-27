# DEVELOPMENT_GUIDELINES.md

# El-bannawy Platform
## Development Guidelines

Version: 1.0.0

---

# Purpose

Defines the engineering standards for every contributor.

These rules are mandatory.

---

# Programming Language

TypeScript Only

JavaScript is prohibited.

---

# Frameworks

Frontend

Next.js 15

Backend

NestJS

Database

Prisma ORM

---

# Code Style

Strict TypeScript

No "any"

ESLint

Prettier

Consistent Formatting

---

# Git Workflow

Feature Branch

↓

Pull Request

↓

Code Review

↓

Automated Tests

↓

Merge

---

# Naming Conventions

PascalCase

Classes

Components

camelCase

Variables

Functions

SCREAMING_SNAKE_CASE

Constants

kebab-case

Folders

---

# Folder Structure

Feature-based architecture.

Avoid deeply nested folders.

Maximum nesting depth

4 Levels

---

# Error Handling

Never ignore exceptions.

Use centralized exception handling.

Return meaningful error messages.

---

# Logging

Structured Logs

No console.log in production.

---

# Documentation

Every public module requires

README

Type Definitions

Examples

---

# Code Review Checklist

✓ Readable

✓ Tested

✓ Typed

✓ Documented

✓ Secure

✓ Performant

---

# Performance

Avoid unnecessary renders.

Optimize database queries.

Cache expensive operations.

---

# Security

Validate all inputs.

Sanitize outputs.

Never trust client data.

---

# Acceptance Criteria

✓ Maintainable

✓ Consistent

✓ Secure

✓ Typed

✓ Documented

---

# Final Rule

Code is written once but maintained for years.

Always optimize for readability and maintainability.

End of Document.