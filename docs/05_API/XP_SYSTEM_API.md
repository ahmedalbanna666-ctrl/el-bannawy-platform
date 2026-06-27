# XP_SYSTEM_API.md

# El-bannawy Platform
## XP System API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Experience Points (XP) System.

The XP API is responsible for:

- Awarding XP
- Tracking XP history
- Managing student levels
- Leaderboards
- Achievements
- Progression
- XP Analytics

XP represents educational achievement only.

It is never used as a payment method.

---

# Base Endpoint

/api/v1/xp

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Teacher
- Administrator

---

# ==========================
# XP DASHBOARD
# ==========================

GET

/xp

Description

Return student's XP dashboard.

Response

```json
{
  "currentXP": 3250,
  "currentLevel": 8,
  "nextLevelXP": 3500,
  "progress": 83,
  "ranking": 12
}
```

---

# ==========================
# XP HISTORY
# ==========================

GET

/xp/history

Description

Return XP transaction history.

Response

```json
[
  {
    "id": "",
    "activity": "Lesson Completed",
    "xp": 50,
    "createdAt": ""
  }
]
```

---

# ==========================
# XP LEVELS
# ==========================

GET

/xp/levels

Description

Return all XP levels.

---

GET

/xp/levels/current

Description

Return current student level.

---

# ==========================
# LEADERBOARD
# ==========================

GET

/xp/leaderboard

Description

Return leaderboard.

Supported Rankings

- Daily
- Weekly
- Monthly
- All Time

Filters

- Grade
- Stage

---

GET

/xp/leaderboard/me

Return current student's ranking.

---

# ==========================
# ACHIEVEMENTS
# ==========================

GET

/xp/achievements

Return earned achievements.

---

GET

/xp/achievements/available

Return available achievements.

---

# ==========================
# XP REWARDS
# ==========================

POST

/xp/rewards

Administrator

Award bonus XP.

Request

```json
{
    "studentId":"",
    "xp":100,
    "reason":"Special Event"
}
```

---

# ==========================
# REMOVE XP
# ==========================

POST

/xp/remove

Administrator

Remove invalid XP.

Every removal must be logged.

---

# ==========================
# ANALYTICS
# ==========================

GET

/xp/analytics

Teacher

Administrator

Return

- Average XP
- Top Students
- XP Distribution
- Level Distribution
- Daily XP Growth

---

# ==========================
# VALIDATION
# ==========================

Validate

- Student Exists
- XP Event Exists
- Duplicate Reward
- Daily Limits

XP is always calculated on the server.

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Modify XP
- Award XP
- Remove XP

Teachers cannot manually award XP.

Only administrators may grant manual rewards.

---

# ==========================
# RATE LIMIT
# ==========================

Leaderboard

30 Requests / Minute

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

XP Dashboard

<200ms

Leaderboard

<300ms

History

<300ms

Analytics

<500ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- XP Awarded
- XP Removed
- Level Up
- Achievement Unlocked
- Leaderboard Updated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ XP dashboard works.

✓ XP history works.

✓ Levels work.

✓ Leaderboards work.

✓ Achievements work.

✓ Analytics work.

✓ Authorization works.

✓ Audit logging works.

---

# Final Rule

The XP API is the authoritative source for all educational achievements.

XP must always be earned through legitimate learning activities and protected from manipulation or unauthorized modification.

End of Document.