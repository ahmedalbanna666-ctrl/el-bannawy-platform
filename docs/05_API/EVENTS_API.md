# EVENTS_API.md

# El-bannawy Platform
## Events & Event Bus API Specification

Version: 1.0.0

---

# Purpose

This document defines the internal event-driven architecture used throughout the El-bannawy Platform.

The Events API is responsible for publishing, consuming and processing domain events asynchronously.

Business modules must communicate through Domain Events whenever possible.

This reduces coupling between modules and improves scalability.

---

# Base Endpoint

/api/v1/events

Internal APIs Only

---

# Authentication

Internal Services

JWT

Service-to-Service Authentication

Students never access these endpoints.

---

# Supported Components

- API Gateway
- Backend Services
- Workers
- Queue System
- Notification Service
- AI Service
- Payment Service

---

# ==========================
# EVENT CATEGORIES
# ==========================

Educational Events

Financial Events

Authentication Events

Notification Events

AI Events

System Events

Analytics Events

---

# ==========================
# EVENT STRUCTURE
# ==========================

Every event follows:

```json
{
    "eventId":"",
    "eventType":"",
    "timestamp":"",
    "source":"",
    "payload":{},
    "version":"1.0"
}
```

---

# ==========================
# PUBLISH EVENT
# ==========================

POST

/events/publish

Description

Publish internal event.

Request

```json
{
    "eventType":"LessonCompleted",
    "payload":{}
}
```

Response

```json
{
    "accepted":true
}
```

---

# ==========================
# EVENT HISTORY
# ==========================

GET

/events/history

Administrator

Return published events.

Supported Filters

- Event Type

- Module

- Date

---

# ==========================
# EVENT DETAILS
# ==========================

GET

/events/{eventId}

Return complete event.

---

# ==========================
# FAILED EVENTS
# ==========================

GET

/events/failed

Return failed events.

---

POST

/events/{eventId}/retry

Retry failed event.

---

# ==========================
# DEAD LETTER QUEUE
# ==========================

GET

/events/dlq

Return Dead Letter Queue.

Administrator

---

POST

/events/dlq/reprocess

Reprocess failed events.

---

# ==========================
# SUBSCRIBERS
# ==========================

GET

/events/subscribers

Return registered subscribers.

Example

- Notifications

- Analytics

- XP

- Coins

- Reports

---

# ==========================
# EVENT TYPES
# ==========================

Educational

- LessonCompleted
- HomeworkSubmitted
- QuizPassed
- VideoCompleted

Authentication

- UserRegistered
- UserLoggedIn
- PasswordChanged

Payments

- PaymentSucceeded
- PaymentFailed
- RefundCompleted

AI

- AIConversationStarted
- AIResponseGenerated

Notifications

- NotificationSent
- NotificationRead

Live Classes

- LiveClassBooked
- LiveClassStarted
- AttendanceRecorded

System

- BackupCompleted
- MaintenanceEnabled
- CacheCleared

---

# ==========================
# EVENT PROCESSING
# ==========================

Every event must support

- Retry

- Timeout

- Idempotency

- Logging

- Monitoring

---

# ==========================
# EVENT ORDERING
# ==========================

Ordering required for

- Payments

- XP

- Coins

- User Registration

Ordering not required for

- Analytics

- Notifications

---

# ==========================
# VALIDATION
# ==========================

Validate

- Event Type

- Payload

- Version

- Publisher

- Signature

---

# ==========================
# SECURITY
# ==========================

Only internal services may publish events.

External users cannot create events.

Every event must be authenticated and logged.

---

# ==========================
# MESSAGE BROKER
# ==========================

Version 1

Redis + BullMQ

Future

Kafka

RabbitMQ

NATS

---

# ==========================
# STATUS CODES
# ==========================

200 OK

202 Accepted

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Publish

<50ms

Consume

<100ms

Retry

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Event Published

- Event Consumed

- Event Failed

- Event Retried

- Subscriber Failure

- DLQ Processing

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Event publishing works.

✓ Event consumption works.

✓ Retry mechanism works.

✓ Dead Letter Queue works.

✓ Event history works.

✓ Subscriber management works.

✓ Monitoring works.

✓ Authorization works.

---

# Final Rule

The Events API is the communication backbone of the El-bannawy Platform.

Business modules must remain loosely coupled by exchanging immutable domain events instead of calling each other directly whenever asynchronous communication is appropriate.

End of Document.