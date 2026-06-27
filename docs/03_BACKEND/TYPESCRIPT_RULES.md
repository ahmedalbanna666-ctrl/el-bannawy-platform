# TYPESCRIPT_RULES.md

# El-bannawy Platform
## TypeScript Standards

Version: 1.0.0

---

# Purpose

This document defines the mandatory TypeScript standards for the El-bannawy Platform.

Every file inside the repository MUST follow these rules.

These rules are not optional.

---

# Compiler Configuration

The project MUST use:

- TypeScript Strict Mode
- strict: true

Never disable strict mode.

---

# Forbidden Compiler Options

Never disable:

- noImplicitAny
- strictNullChecks
- noUncheckedIndexedAccess
- noImplicitReturns
- noFallthroughCasesInSwitch

---

# Never Use

The following are prohibited:

- any
- @ts-ignore
- @ts-expect-error
- eslint-disable
- Object
- Function

---

# Prefer

Always prefer

- unknown
- interfaces
- readonly
- enums
- literal types
- union types
- discriminated unions
- generics

---

# Type Safety

Every variable must have a known type.

Never rely on implicit behavior.

Incorrect

const user = {};

Correct

const user: User = {};

---

# Interface Rules

Interfaces represent contracts.

Use interfaces for:

- API responses
- DTOs
- Services
- Repository Contracts
- Component Props
- Context Values

---

# Type Alias Rules

Use type aliases only for:

- Union Types
- Utility Types
- Function Types
- Mapped Types

---

# Interface Naming

Always start with

I

Example

IStudent

ILesson

IHomework

---

# Enum Rules

Every enum ends with

Enum

Example

LessonStatusEnum

UserRoleEnum

NotificationTypeEnum

---

# Generic Rules

Use descriptive names.

Correct

TStudent

TLesson

TResponse

Incorrect

T

U

X

---

# Null Handling

Never assume values exist.

Always validate

- null
- undefined

Use optional chaining.

Use nullish coalescing.

---

# Readonly

Use readonly whenever mutation is unnecessary.

Example

readonly id

readonly createdAt

---

# Function Return Types

Always declare return types.

Incorrect

function createLesson(){}

Correct

function createLesson(): Lesson {}

---

# Async Rules

Always use

Promise<T>

Never use

Promise<any>

---

# Object Rules

Never use

Object

Use explicit interfaces.

---

# Array Rules

Always type arrays.

Correct

Lesson[]

Array<Lesson>

Incorrect

[]

Array<any>

---

# API Rules

Every API response must have explicit typing.

Never return

any

---

# React Props

Every component must define Props.

Example

interface IButtonProps

Never use implicit props.

---

# Hook Rules

Every hook must define:

- Parameters
- Return Type

Explicitly.

---

# DTO Rules

Every DTO must:

- Be immutable when possible.
- Be validated.
- Be documented.

---

# Utility Types

Prefer built-in utilities:

- Partial
- Pick
- Omit
- Required
- Readonly
- Record

Avoid reinventing them.

---

# Type Assertions

Avoid

as

unless absolutely necessary.

Never use

as any

---

# Unknown

Prefer

unknown

over

any

Always narrow before usage.

---

# Error Typing

Errors should be typed.

Never assume caught values are Error.

Example

catch (error: unknown)

---

# Imports

Always import types using

import type

when possible.

---

# Barrel Files

Use index.ts only where documented.

Avoid excessive barrel exports.

---

# Constants

Always type exported constants.

---

# Immutability

Prefer immutable data structures.

Avoid unnecessary mutations.

---

# Lint Compliance

Every file must pass:

- ESLint
- TypeScript
- Prettier

Without warnings.

---

# Final Checklist

Before completing any TypeScript file:

✓ No any

✓ No ts-ignore

✓ Explicit return types

✓ Interfaces documented

✓ Null safe

✓ Readonly used

✓ Strict mode compatible

✓ ESLint passed

✓ Production ready

---

# Final Principle

TypeScript is used to eliminate runtime errors before deployment.

Strong typing is mandatory.

End of Document.