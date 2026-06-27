# DECISIONS.md

# El-bannawy Platform
## Architecture Decisions

Version: 1.0

---

# Purpose

This document records architectural decisions that define the foundation of the project.

These decisions are mandatory and cannot be changed without creating an Architecture Decision Record (ADR).

---

## DECISION-001
### Primary Programming Language

TypeScript is the only programming language used across the project.

Status: Approved

---

## DECISION-002
### Monorepo

The entire platform will be maintained in a single Turborepo repository.

Status: Approved

---

## DECISION-003
### Backend Framework

NestJS is the official backend framework.

Alternative frameworks are not permitted without an ADR.

Status: Approved

---

## DECISION-004
### Frontend Framework

Next.js 15 (App Router) is the official web framework.

Status: Approved

---

## DECISION-005
### Mobile Framework

React Native with Expo is the official mobile solution.

Status: Approved

---

## DECISION-006
### Desktop Framework

Electron is the official desktop solution.

Status: Approved

---

## DECISION-007
### Database

PostgreSQL is the official relational database.

Prisma ORM is mandatory.

Status: Approved

---

## DECISION-008
### Architecture Style

The platform follows:

- Modular Monolith
- Clean Architecture
- Domain-Driven Design

Status: Approved

---

## DECISION-009
### Documentation

Documentation is the single source of truth.

If code conflicts with documentation, documentation must be followed.

Status: Approved

---

## DECISION-010
### Business Logic

Business logic must never be inferred.

If a rule is undocumented, implementation must stop until clarification is provided.

Status: Approved

---

## DECISION-011
### Naming

Documented entity names are immutable.

Examples:

Lesson
Unit
Story
Coins
XP

These names must never be replaced by synonyms.

Status: Approved

---

## DECISION-012
### AI Development

All AI Coding Agents must read the documentation before generating code.

Skipping documentation is prohibited.

Status: Approved

---

Future architectural changes must be documented as ADR files before implementation.
