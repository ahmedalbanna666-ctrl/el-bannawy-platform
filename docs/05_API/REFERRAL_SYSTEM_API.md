# REFERRAL_SYSTEM_API.md

# El-bannawy Platform
## Referral System API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Referral System.

The Referral API is responsible for:

- Generating referral links
- Tracking invitations
- Validating referrals
- Awarding referral rewards
- Preventing referral fraud
- Referral analytics

The Referral System supports platform growth while maintaining educational fairness.

---

# Base Endpoint

/api/v1/referrals

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Administrator

Teachers and Secretaries have read-only access to referral statistics.

---

# ==========================
# MY REFERRAL
# ==========================

GET

/referrals/me

Description

Return student's referral information.

Response

```json
{
    "referralCode":"ABCD1234",
    "referralLink":"https://el-bannawy.com/r/ABCD1234",
    "successfulReferrals":12,
    "pendingReferrals":3,
    "coinsEarned":1200
}
```

---

# ==========================
# REFERRAL HISTORY
# ==========================

GET

/referrals/history

Description

Return referral history.

Response

```json
[
    {
        "id":"",
        "studentName":"",
        "status":"approved",
        "reward":100,
        "createdAt":""
    }
]
```

---

# ==========================
# REFERRAL DETAILS
# ==========================

GET

/referrals/{referralId}

Description

Return referral details.

Includes

- Referral Status
- Registration Date
- Reward Status
- Validation Information

---

# ==========================
# APPLY REFERRAL
# ==========================

POST

/referrals/apply

Description

Apply referral code during registration.

Request

```json
{
    "referralCode":"ABCD1234"
}
```

Response

```json
{
    "accepted":true,
    "status":"pending_validation"
}
```

---

# ==========================
# REFERRAL STATUS
# ==========================

GET

/referrals/status/{referralId}

Description

Return referral validation status.

Possible Values

- Pending
- Approved
- Rejected
- Expired

---

# ==========================
# REWARD STATUS
# ==========================

GET

/referrals/rewards

Description

Return referral rewards.

Response

```json
{
    "totalRewards":1200,
    "availableCoins":1200
}
```

---

# ==========================
# LEADERBOARD
# ==========================

GET

/referrals/leaderboard

Description

Return top referrers.

Supported Rankings

- Weekly
- Monthly
- All Time

---

# ==========================
# ADMIN VALIDATION
# ==========================

POST

/referrals/{referralId}/approve

Administrator

Approve referral.

Reward generated automatically.

---

POST

/referrals/{referralId}/reject

Administrator

Reject referral.

No reward granted.

---

# ==========================
# CAMPAIGNS
# ==========================

GET

/referrals/campaigns

Return active referral campaigns.

---

POST

/referrals/campaigns

Administrator

Create referral campaign.

---

PATCH

/referrals/campaigns/{campaignId}

Update campaign.

---

DELETE

/referrals/campaigns/{campaignId}

Archive campaign.

---

# ==========================
# ANALYTICS
# ==========================

GET

/referrals/analytics

Administrator

Return

- Invitations Sent
- Registration Rate
- Approval Rate
- Coins Awarded
- Top Referrers
- Fraud Attempts

---

# ==========================
# VALIDATION
# ==========================

Validate

- Referral Code Exists
- Student Eligibility
- Mobile Verification
- Duplicate Registration
- Self Referral
- Device Validation
- First Purchase Requirement

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Modify referral history
- Generate fake rewards
- Use their own referral code
- Claim duplicate rewards

All validation occurs on the server.

---

# ==========================
# RATE LIMIT
# ==========================

Referral Lookup

30 Requests / Minute

Referral Apply

10 Requests / Minute

Leaderboard

30 Requests / Minute

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

Referral Lookup

<200ms

Referral Validation

<2 Seconds

Leaderboard

<300ms

Reward Processing

<3 Seconds

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Referral Created
- Referral Applied
- Referral Approved
- Referral Rejected
- Reward Granted
- Fraud Detected

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Referral links work.

✓ Referral application works.

✓ Validation works.

✓ Reward generation works.

✓ Leaderboards work.

✓ Analytics work.

✓ Fraud prevention works.

✓ Authorization works.

---

# Final Rule

The Referral API must reward only legitimate student invitations.

Every referral reward must pass all validation rules before being granted, ensuring fairness, transparency and protection against fraud.

End of Document.