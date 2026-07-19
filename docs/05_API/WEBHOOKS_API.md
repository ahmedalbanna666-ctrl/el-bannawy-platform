# WEBHOOKS_API.md

# El-bannawy Platform
## Webhooks API Specification

Version: 1.0.0

---

# Purpose

This document defines all webhook endpoints used by the El-bannawy Platform.

Webhooks allow external systems to securely notify the platform whenever an event occurs.

Version 1 primarily supports:

- Payment Gateway
- WhatsApp Provider
- Email Provider
- SMS Provider
- AI Provider
- Future Third-Party Integrations

All webhook requests must be authenticated and verified before processing.

---

# Base Endpoint

/api/v1/webhooks

---

# Authentication

Webhook Signature

HMAC SHA-256

Timestamp Validation

Replay Protection

JWT is NOT used for webhook authentication.

---

# Supported Providers

- Paymob
- Fawry
- WhatsApp Business API
- Email Provider
- SMS Provider
- AI Provider

Future

- Stripe

- PayPal

---

# ==========================
# PAYMENT WEBHOOK
# ==========================

POST

/webhooks/payments

Description

Receive payment events.

Supported Events

- Payment Success

- Payment Failed

- Payment Expired

- Refund

Response

```json
{
    "received":true
}
```

Signature

Header: x-signature (HMAC SHA-256 hex)

Header: x-timestamp (Unix epoch milliseconds)

Signed payload:

```text
${x-timestamp}.${rawRequestBody}
```

Secret: PAYMENT_WEBHOOK_SECRET

Replay Protection

x-timestamp must be within 5 minutes of server time.

Request Body Example

```json
{
    "provider": "fawry",
    "event": "PAYMENT_SUCCESS",
    "timestamp": "1710000000000",
    "payload": {
        "merchantRefNumber": "clx000paymentid",
        "referenceNumber": "902244",
        "fawryRefNumber": "TXN123",
        "status": "PAID",
        "amount": 100.0
    }
}
```

Supported providers: paymob, fawry, instapay, vodafone_cash, orange_cash, etisalat_cash.

The webhook locates the PENDING Payment by gatewayRef (merchantRefNumber / referenceNumber) and completes it.

---

# ==========================
# WHATSAPP WEBHOOK
# ==========================

POST

/webhooks/whatsapp

Description

Receive WhatsApp delivery events.

Supported Events

- Sent

- Delivered

- Read

- Failed

---

# ==========================
# EMAIL WEBHOOK
# ==========================

POST

/webhooks/email

Description

Receive email events.

Supported Events

- Delivered

- Opened

- Clicked

- Failed

- Bounced

---

# ==========================
# SMS WEBHOOK
# ==========================

POST

/webhooks/sms

Description

Receive SMS events.

Supported Events

- Sent

- Delivered

- Failed

---

# ==========================
# AI WEBHOOK
# ==========================

POST

/webhooks/ai

Description

Receive asynchronous AI processing results.

Examples

- Document Analysis

- Image Analysis

- Long Running Tasks

---

# ==========================
# TEST WEBHOOK
# ==========================

POST

/webhooks/test

Administrator

Validate webhook configuration.

Response

```json
{
    "success":true,
    "latency":145
}
```

---

# ==========================
# WEBHOOK LOGS
# ==========================

GET

/webhooks/logs

Administrator

Return webhook history.

Filters

- Provider

- Event

- Status

- Date

---

GET

/webhooks/logs/{id}

Return webhook details.

Includes

- Headers

- Payload

- Processing Result

- Response Time

---

# ==========================
# RETRY WEBHOOK
# ==========================

POST

/webhooks/logs/{id}/retry

Administrator

Retry failed webhook.

Maximum Retries

5

---

# ==========================
# VALIDATION
# ==========================

Validate

- Signature

- Timestamp

- Payload

- Provider

- Event Type

Reject

- Invalid Signature

- Expired Timestamp

- Duplicate Event

---

# ==========================
# SECURITY
# ==========================

Every webhook request must:

- Verify Signature

- Validate Timestamp

- Prevent Replay Attacks

- Log Every Request

Never trust external payloads before validation.

---

# ==========================
# RATE LIMIT
# ==========================

Incoming Webhooks

300 Requests / Minute

Webhook Retry

20 Requests / Minute

Webhook Logs

30 Requests / Minute

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

Webhook Verification

<100ms

Webhook Processing

<500ms

Webhook Retry

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Webhook Received

- Signature Verified

- Event Processed

- Retry Executed

- Processing Failed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Payment webhooks work.

✓ WhatsApp webhooks work.

✓ Email webhooks work.

✓ SMS webhooks work.

✓ AI webhooks work.

✓ Signature verification works.

✓ Replay protection works.

✓ Retry mechanism works.

---

# Final Rule

Every webhook must be treated as an untrusted external request until its authenticity has been fully verified.

No business logic may execute before signature validation, timestamp verification and replay protection are successfully completed.

End of Document.