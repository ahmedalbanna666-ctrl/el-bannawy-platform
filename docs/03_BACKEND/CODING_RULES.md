# CODING_RULES.md

# El-bannawy Platform
## Coding Standards

Version: 1.0.0

---

# Purpose

This document defines the mandatory coding standards for the El-bannawy Platform.

Every AI Agent and every developer MUST follow these rules.

No exceptions.

---

# Code Philosophy

Always write code that is:

- Simple
- Readable
- Maintainable
- Reusable
- Testable
- Production Ready

Never optimize readability away.

---

# Golden Rules

Write code for humans first.

Machines are secondary.

The next developer should understand your code within minutes.

---

# Clean Code

Always

- Keep functions small.
- Keep files focused.
- Keep responsibilities isolated.
- Remove duplication.
- Prefer composition over inheritance.

Never

- Write spaghetti code.
- Write God Classes.
- Mix responsibilities.

---

# SOLID

Every module must follow

- Single Responsibility Principle
- Open Closed Principle
- Liskov Substitution Principle
- Interface Segregation Principle
- Dependency Inversion Principle

---

# DRY

Don't Repeat Yourself.

If code is duplicated more than once,

extract it.

---

# KISS

Keep It Simple.

Do not introduce complexity without a documented reason.

---

# YAGNI

You Aren't Gonna Need It.

Never implement future features that are not documented.

---

# Function Rules

Every function should

- Have one responsibility.
- Be easy to understand.
- Have descriptive names.
- Return predictable results.

Avoid functions larger than 50 lines.

---

# Class Rules

Each class should represent one concept.

Never create large utility classes.

---

# Variable Naming

Use descriptive names.

Correct

studentProgress

lessonCompletion

homeworkResult

Incorrect

data

temp

item

obj

value

---

# Boolean Naming

Always start with

is

has

can

should

Example

isCompleted

hasHomework

canAccessLesson

shouldNotify

---

# Async Rules

Always use

async/await

Avoid nested Promise chains.

Always handle exceptions.

---

# Error Handling

Never ignore errors.

Always

- Catch expected errors.
- Throw meaningful exceptions.
- Log unexpected failures.

Never return silent failures.

---

# Magic Numbers

Never hardcode numbers.

Extract constants.

Correct

MAX_UPLOAD_SIZE

DEFAULT_XP_REWARD

Incorrect

500

1024

9999

inside business logic.

---

# Strings

Never hardcode repeated strings.

Extract constants or enums.

---

# Comments

Comment WHY.

Not WHAT.

Avoid unnecessary comments.

---

# Nesting

Avoid deep nesting.

Maximum recommended nesting:

3 levels.

Prefer early return.

---

# Null Safety

Always validate

null

undefined

empty collections

before use.

---

# Defensive Programming

Never trust

- User input
- API input
- External services

Always validate.

---

# Reusability

If a piece of logic is reused,

extract it.

Examples

Hooks

Services

Utilities

Helpers

Components

---

# Performance

Avoid

- Duplicate database queries.
- Duplicate API requests.
- Unnecessary rendering.
- Unnecessary calculations.

---

# React Rules

Never place business logic inside components.

Components should focus on UI.

---

# Backend Rules

Controllers

Receive requests only.

Services

Contain business logic.

Repositories

Access the database only.

Never mix responsibilities.

---

# Database Rules

Never access Prisma directly from Controllers.

Always go through Services.

---

# Logging

Never leave

console.log()

console.error()

console.warn()

inside production code.

---

# Security

Always validate

- Input
- Authentication
- Authorization

Never expose sensitive information.

---

# Refactoring

Always improve existing code without changing behavior.

Never refactor undocumented business logic.

---

# Testing

Every important function should be testable.

Avoid tightly coupled code.

Prefer dependency injection.

---

# Code Review Checklist

Before considering code complete:

- Readable
- Typed
- Tested
- Lint Passed
- No Duplication
- Small Functions
- Proper Naming
- Follows Architecture
- No Dead Code
- No Console Logs
- No TODOs

---

# Forbidden

Never

- Use any
- Disable TypeScript
- Disable ESLint
- Copy random internet code
- Ignore documentation
- Ignore architecture
- Generate placeholder code
- Guess business rules

---

# Final Principle

Readable code is scalable code.

Maintainable code is professional code.

End of Document.