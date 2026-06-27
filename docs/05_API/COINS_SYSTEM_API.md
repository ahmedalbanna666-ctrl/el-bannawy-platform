# COINS_SYSTEM_API.md

# El-bannawy Platform
## Coins System API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Coins System.

The Coins API is responsible for:

- Coin Wallet
- Coin Packages
- Coin Purchases
- Coin Transactions
- Wallet Balance
- Coin Rewards
- Spending History

Coins are the premium virtual currency of the platform.

Coins are never used for educational ranking.

---

# Base Endpoint

/api/v1/coins

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Secretary
- Administrator

Teachers have read-only access.

---

# ==========================
# WALLET
# ==========================

GET

/coins/wallet

Description

Return student's wallet.

Response

```json
{
    "balance":350,
    "totalPurchased":1200,
    "totalSpent":850,
    "pending":0
}
```

---

# ==========================
# TRANSACTIONS
# ==========================

GET

/coins/transactions

Description

Return wallet transaction history.

Response

```json
[
    {
        "id":"",
        "type":"purchase",
        "amount":500,
        "balanceAfter":850,
        "createdAt":""
    }
]
```

---

# ==========================
# COIN PACKAGES
# ==========================

GET

/coins/packages

Description

Return available Coin Packages.

Response

```json
[
    {
        "id":"",
        "coins":500,
        "price":250
    }
]
```

---

GET

/coins/packages/{packageId}

Return package details.

---

# ==========================
# PURCHASE PACKAGE
# ==========================

POST

/coins/purchase

Description

Purchase Coin Package.

Request

```json
{
    "packageId":"",
    "paymentMethod":"paymob"
}
```

Response

```json
{
    "paymentUrl":"",
    "status":"pending"
}
```

---

# ==========================
# PAYMENT VERIFICATION
# ==========================

POST

/coins/verify

Description

Verify payment.

Server verifies gateway response.

Successful Response

```json
{
    "verified":true,
    "coinsAdded":500,
    "walletBalance":850
}
```

---

# ==========================
# SPEND COINS
# ==========================

POST

/coins/spend

Internal API

Used when purchasing:

- Lesson
- Unit
- Full Course

Students never call this endpoint directly.

---

# ==========================
# REWARD COINS
# ==========================

POST

/coins/reward

Administrator

Award promotional Coins.

Request

```json
{
    "studentId":"",
    "coins":100,
    "reason":"Competition Winner"
}
```

---

# ==========================
# REMOVE COINS
# ==========================

POST

/coins/remove

Administrator

Remove Coins.

Every operation requires audit logging.

---

# ==========================
# ANALYTICS
# ==========================

GET

/coins/analytics

Administrator

Return

- Coins Sold
- Coins Rewarded
- Coins Spent
- Active Wallets
- Average Purchase

---

# ==========================
# VALIDATION
# ==========================

Validate

- Wallet Exists
- Package Exists
- Payment Verified
- Balance Available
- Duplicate Payment
- Fraud Detection

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Modify Wallet
- Create Coins
- Spend Negative Balance
- Modify Transactions

All wallet operations occur server-side.

---

# ==========================
# RATE LIMIT
# ==========================

Wallet

60 Requests / Minute

Purchase

10 Requests / Minute

Verification

10 Requests / Minute

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

Wallet

<200ms

Transactions

<300ms

Package List

<200ms

Purchase Verification

<3 Seconds

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Package Purchased
- Coins Added
- Coins Removed
- Coins Spent
- Wallet Updated
- Payment Verified

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Wallet works.

✓ Package listing works.

✓ Coin purchases work.

✓ Payment verification works.

✓ Spending works.

✓ Transaction history works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Coins API is the single source of truth for all virtual currency transactions.

Every Coin operation must be secure, auditable, atomic and synchronized with the Payments Module.

End of Document.