# INTEGRATIONS_API.md

# El-bannawy Platform
## External Integrations API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to third-party integrations used by the El-bannawy Platform.

The Integrations API provides a centralized interface for communicating with external services while keeping the platform architecture modular and provider-independent.

All external integrations must pass through this module.

Direct integration from business modules is prohibited.

---

# Base Endpoint

/ api/v1/integrations

---

# Authentication

Required

JWT Access Token

Administrator Role

Internal Services

---

# Supported Roles

- Administrator

- Internal Services

Students and teachers never call these APIs directly.

---

# ==========================
# PROVIDERS
# ==========================

GET

/integrations/providers

Description

Return configured providers.

Response

```json
[
    {
        "id":"",
        "name":"Paymob",
        "status":"connected",
        "health":"healthy"
    }
]
```

---

# ==========================
# PROVIDER DETAILS
# ==========================

GET

/integrations/providers/{providerId}

Return provider details.

Includes

- Status

- Version

- Last Health Check

- Configuration

---

# ==========================
# CONNECTION TEST
# ==========================

POST

/integrations/providers/{providerId}/test

Administrator

Description

Run connectivity test.

Response

```json
{
    "success":true,
    "latency":135
}
```

---

# ==========================
# ENABLE PROVIDER
# ==========================

POST

/integrations/providers/{providerId}/enable

Administrator

Enable provider.

---

POST

/integrations/providers/{providerId}/disable

Disable provider.

---

# ==========================
# HEALTH CHECK
# ==========================

GET

/integrations/health

Return

- Payment Gateway

- AI Provider

- WhatsApp

- Email

- SMS

- Storage

Status

Healthy

Warning

Offline

---

# ==========================
# CONFIGURATION
# ==========================

GET

/integrations/configuration

Administrator

Return integration settings.

Secrets must never be exposed.

---

PATCH

/integrations/configuration

Update provider configuration.

---

# ==========================
# WEBHOOK STATUS
# ==========================

GET

/integrations/webhooks

Return webhook status.

Includes

- Active Endpoints

- Failed Deliveries

- Retry Queue

---

# ==========================
# RETRY FAILED REQUESTS
# ==========================

POST

/integrations/retry

Administrator

Retry failed external requests.

---

# ==========================
# REQUEST HISTORY
# ==========================

GET

/integrations/history

Return

- Provider

- Request Time

- Response Time

- Status

- Retry Count

---

# ==========================
# RATE LIMIT STATUS
# ==========================

GET

/integrations/rate-limits

Return provider rate limits.

Examples

- AI

- Payment

- WhatsApp

- Email

---

# ==========================
# SUPPORTED PROVIDERS
# ==========================

Version 1

- OpenAI

- Gemini

- DeepSeek

- Paymob

- Fawry

- WhatsApp Business API

- SMTP Email

- Firebase Cloud Messaging

Future

- Stripe

- PayPal

- Twilio

- AWS S3

- Cloudflare R2

---

# ==========================
# VALIDATION
# ==========================

Validate

- Provider Exists

- Configuration Exists

- Authentication

- Connection Status

- Retry Policy

---

# ==========================
# SECURITY
# ==========================

API Keys

Secrets

Tokens

Certificates

must never be returned by any endpoint.

All secrets must be encrypted at rest.

---

# ==========================
# RATE LIMIT
# ==========================

Health Checks

60 Requests / Minute

Configuration

10 Requests / Minute

Retry

20 Requests / Minute

---

# ==========================
# STATUS CODES
# ==========================

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

503 Service Unavailable

---

# ==========================
# PERFORMANCE
# ==========================

Health Check

<200ms

Configuration Retrieval

<300ms

Retry Processing

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Provider Enabled

- Provider Disabled

- Configuration Updated

- Connection Tested

- Retry Executed

- Health Check Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Provider management works.

✓ Health checks work.

✓ Configuration management works.

✓ Retry mechanism works.

✓ History works.

✓ Rate limit monitoring works.

✓ Authorization works.

---

# Final Rule

The Integrations API is the single gateway between the El-bannawy Platform and all external services.

No module within the platform may communicate directly with third-party providers. All external communication must pass through the Integrations API to ensure security, consistency, observability and maintainability.

End of Document.