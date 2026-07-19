# PAYMENTS_API.md

# El-bannawy Platform
## Payments API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Payments Module.

The Payments API manages the complete financial workflow of the El-bannawy Platform.

It supports:

- Course Purchases
- Unit Purchases
- Lesson Purchases
- Coin Purchases
- Payment Verification
- Refunds
- Coupons
- Invoices
- Financial Reports

All financial operations must be secure, auditable and atomic.

---

# Base Endpoint

/api/v1/payments

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Parent
- Secretary
- Administrator

Teachers have read-only access to payment status.

---

# ==========================
# PAYMENT METHODS
# ==========================

GET

/payments/methods

Description

Return supported payment methods.

Version 1

- Paymob
- Fawry
- Instapay
- Vodafone Cash
- Orange Cash
- Etisalat Cash
- Vodafone Cash
- Orange Cash
- Etisalat Cash

Future

- Stripe
- PayPal
- Apple Pay
- Google Pay

---

# ==========================
# GATEWAY CONFIGURATION
# ==========================

Each payment method is gated by environment credentials.

When credentials are present, the backend calls the real gateway API during checkout and verification.

When credentials are absent, the gateway runs in SIMULATION MODE and returns a local confirmation URL so the flow can be tested end-to-end without a live account.

Environment Variables

| Gateway | Variables |
| --- | --- |
| Paymob | PAYMOB_API_KEY, PAYMOB_HMAC_SECRET, PAYMOB_MERCHANT_ID, PAYMOB_BASE_URL, PAYMOB_INTEGRATION_IDS |
| Fawry | FAWRY_MERCHANT_CODE, FAWRY_SECURITY_KEY, FAWRY_BASE_URL |
| Instapay | INSTAPAY_API_KEY, INSTAPAY_BASE_URL |
| Vodafone Cash | VODAFONE_CASH_MERCHANT_ID, VODAFONE_CASH_SECRET, VODAFONE_CASH_BASE_URL |
| Orange Cash | ORANGE_CASH_MERCHANT_ID, ORANGE_CASH_SECRET, ORANGE_CASH_BASE_URL |
| Etisalat Cash | ETISALAT_CASH_MERCHANT_ID, ETISALAT_CASH_SECRET, ETISALAT_CASH_BASE_URL |

Webhook Secret

PAYMENT_WEBHOOK_SECRET (used to verify POST /api/v1/webhooks/payments)

Base URL used in callback/redirect links

PUBLIC_BASE_URL

Enabled flag returned by GET /payments/methods reflects whether credentials are configured.

---

# ==========================
# CHECKOUT
# ==========================

POST

/payments/checkout

Description

Create checkout session.

Request

```json
{
    "productType":"lesson",
    "productId":"",
    "paymentMethod":"paymob"
}
```

Response

```json
{
    "checkoutId":"",
    "paymentUrl":"",
    "expiresAt":""
}
```

---

# ==========================
# VERIFY PAYMENT
# ==========================

POST

/payments/verify

Description

Verify payment.

Server validates payment gateway response.

Response

```json
{
    "verified":true,
    "status":"successful",
    "transactionId":""
}
```

---

# ==========================
# PAYMENT HISTORY
# ==========================

GET

/payments/history

Description

Return payment history.

Supported Filters

- Status
- Product Type
- Date

---

GET

/payments/{paymentId}

Return payment details.

---

# ==========================
# INVOICES
# ==========================

GET

/payments/invoices

Return invoices.

---

GET

/payments/invoices/{invoiceId}

Return invoice details.

---

GET

/payments/invoices/{invoiceId}/download

Download invoice.

Supported

- PDF

---

# ==========================
# REFUNDS
# ==========================

POST

/payments/{paymentId}/refund

Administrator

Create refund request.

---

GET

/payments/refunds

Return refund history.

---

PATCH

/payments/refunds/{refundId}

Approve or reject refund.

Administrator only.

---

# ==========================
# COUPONS
# ==========================

POST

/payments/coupons/validate

Validate coupon.

Request

```json
{
    "couponCode":""
}
```

Response

```json
{
    "valid":true,
    "discount":20
}
```

---

GET

/payments/coupons

Administrator

Return coupon list.

---

POST

/payments/coupons

Administrator

Create coupon.

---

PATCH

/payments/coupons/{couponId}

Update coupon.

---

DELETE

/payments/coupons/{couponId}

Archive coupon.

---

# ==========================
# TRANSACTIONS
# ==========================

GET

/payments/transactions

Administrator

Return transactions.

Filters

- Date
- Status
- Gateway
- Student

---

# ==========================
# ANALYTICS
# ==========================

GET

/payments/analytics

Administrator

Return

- Total Revenue

- Daily Revenue

- Monthly Revenue

- Payment Success Rate

- Refund Rate

- Average Order Value

- Coin Revenue

---

# ==========================
# VALIDATION
# ==========================

Validate

- Product Exists

- Payment Method

- Coupon

- Gateway Response

- Duplicate Payment

- Student Authorization

---

# ==========================
# SECURITY
# ==========================

Never expose

- Card Numbers

- CVV

- Payment Tokens

- Gateway Secrets

Every payment verification occurs server-side.

---

# ==========================
# RATE LIMIT
# ==========================

Checkout

20 Requests / Minute

Verification

20 Requests / Minute

History

60 Requests / Minute

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

---

# ==========================
# PERFORMANCE
# ==========================

Checkout

<500ms

Verification

<3 Seconds

History

<300ms

Invoice Download

<500ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Checkout Created

- Payment Verified

- Refund Requested

- Refund Approved

- Coupon Applied

- Invoice Generated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Checkout works.

✓ Payment verification works.

✓ Payment history works.

✓ Invoice generation works.

✓ Refund workflow works.

✓ Coupon validation works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Payments API is the authoritative gateway for every financial transaction within the El-bannawy Platform.

No educational content, Coin package or premium feature may be activated until the payment has been successfully verified by the server.

End of Document.