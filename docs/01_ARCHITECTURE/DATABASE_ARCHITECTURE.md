# DATABASE_ARCHITECTURE.md

# El-bannawy Platform
## Database Architecture

Version: 1.0.0

---

# Purpose

This document defines the official database architecture of the El-bannawy Platform.

The database is designed to support millions of students while maintaining high performance, scalability and data consistency.

The architecture follows Domain Driven Design (DDD) and Clean Architecture principles.

---

# Database Engine

Official Database

PostgreSQL

Version

Latest Stable Version

---

# ORM

Official ORM

Prisma ORM

No other ORM is allowed without an approved ADR.

---

# Database Philosophy

The database is organized by Domains.

Every module owns its own entities.

Modules communicate through services rather than direct table coupling whenever possible.

---

# Main Domains

Authentication

↓

Users

↓

Education

↓

Learning Progress

↓

Assessment

↓

Gamification

↓

Payments

↓

Communication

↓

Reporting

↓

Administration

---

# Core Entity Groups

Authentication

- Users
- Sessions
- Refresh Tokens
- Login History

Education

- Stages
- Grades
- Units
- Lessons
- Story
- Vocabulary

Learning

- Lesson Progress
- Video Progress
- Homework
- Quiz Attempts

Assessment

- Homework Answers
- Quiz Answers
- Mistakes

Gamification

- XP
- Coins
- Achievements
- Leaderboards

Communication

- Notifications
- WhatsApp Queue
- Emails

Financial

- Payments
- Transactions
- Wallet
- Coin Packages

Administration

- Roles
- Permissions
- Audit Logs

---

# Primary Keys

Every table uses

UUID

Never use Auto Increment IDs.

---

# Naming Convention

Tables

snake_case

Columns

snake_case

Indexes

idx_table_column

Foreign Keys

fk_table_column

Unique Constraints

uq_table_column

---

# Timestamp Convention

Every table contains

created_at

updated_at

Soft delete tables also contain

deleted_at

---

# Audit Fields

Whenever applicable

created_by

updated_by

deleted_by

---

# Soft Delete Policy

Business entities should use

Soft Delete

Critical system entities

Never deleted

Examples

Payments

Audit Logs

Transactions

---

# Relationships

Use Foreign Keys.

Never duplicate data unnecessarily.

Favor normalization.

---

# Indexing Strategy

Index:

Foreign Keys

Search Fields

Frequently Filtered Columns

Unique Columns

Composite Indexes for heavy queries.

---

# Transactions

Use database transactions for:

Payments

Wallet Updates

XP Updates

Coins

Lesson Completion

Referral Rewards

Every financial operation must be atomic.

---

# Constraints

Always enforce:

NOT NULL

UNIQUE

CHECK

FOREIGN KEY

Never rely only on application validation.

---

# Data Integrity

Every entity must preserve referential integrity.

Cascade deletes should be avoided unless documented.

---

# Performance

Use:

Indexes

Pagination

Lazy Loading

Efficient Queries

Avoid:

N+1 Queries

Full Table Scans

Repeated Queries

---

# Caching

Redis caches:

Dashboard

Leaderboards

Reports

AI Context

Frequently Accessed Lessons

---

# Search

Full Text Search

PostgreSQL Search

Future

ElasticSearch

---

# Vector Search

Use

pgvector

For

AI Retrieval

Semantic Search

Lesson Search

Document Search

---

# Backup Strategy

Daily Backup

Weekly Backup

Monthly Archive

Point-In-Time Recovery enabled.

---

# Security

Encrypt:

Passwords

Refresh Tokens

Sensitive Secrets

Never store plaintext credentials.

---

# Migration Rules

Use Prisma Migrations only.

Never modify production tables manually.

---

# Monitoring

Monitor:

Query Performance

Slow Queries

Connections

Storage

Replication

---

# Future Scalability

Prepared for:

10 Million Students

100 Million Quiz Records

1 Billion Notifications

Horizontal Read Scaling

---

# Acceptance Criteria

Database Architecture is complete when:

✓ Domain separation exists.

✓ Constraints are enforced.

✓ Relationships are normalized.

✓ Indexes exist.

✓ Migrations are versioned.

✓ Performance targets are met.

✓ Backup strategy is implemented.

✓ Security policies are enforced.

---

# Final Rule

The database is the single source of truth for platform data.

Every schema modification must be documented before implementation.

End of Document.