# EDUCATIONAL_GAMES_API.md

# El-bannawy Platform
## Educational Games API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Educational Games Module.

The Educational Games API manages:

- Game Catalog
- Game Sessions
- Player Progress
- XP Rewards
- Scores
- Statistics
- Educational Analytics

Educational Games are supplementary learning activities and never replace the official curriculum.

---

# Base Endpoint

/api/v1/games

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
# GAME CATALOG
# ==========================

GET

/games

Description

Return all available educational games.

Filters

- Category
- Difficulty
- Lesson
- Unit

Response

```json
[
    {
        "id":"",
        "title":"",
        "category":"Vocabulary",
        "difficulty":"Easy",
        "xpReward":25,
        "estimatedDuration":5
    }
]
```

---

GET

/games/{gameId}

Description

Return game details.

Includes

- Instructions
- Difficulty
- XP Reward
- Estimated Duration

---

# ==========================
# START GAME
# ==========================

POST

/games/{gameId}/start

Description

Create new game session.

Response

```json
{
    "sessionId":"",
    "startedAt":""
}
```

---

# ==========================
# SAVE GAME
# ==========================

PATCH

/games/{gameId}/save

Description

Save game progress.

Request

```json
{
    "sessionId":"",
    "progress":55
}
```

---

# ==========================
# SUBMIT GAME
# ==========================

POST

/games/{gameId}/finish

Description

Submit completed game.

Response

```json
{
    "score":95,
    "xpAwarded":40,
    "completed":true
}
```

---

# ==========================
# GAME HISTORY
# ==========================

GET

/games/history

Description

Return previously played games.

Includes

- Highest Score
- Average Score
- Best Time
- XP Earned

---

# ==========================
# GAME PROGRESS
# ==========================

GET

/games/progress

Description

Return:

- Games Played
- Games Completed
- Total XP
- Completion Percentage

---

# ==========================
# GAME LEADERBOARD
# ==========================

GET

/games/leaderboard

Description

Return game rankings.

Supported Rankings

- Daily
- Weekly
- Monthly

Version 1

Uses XP earned from games.

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/games

Create educational game.

Teacher

Administrator

---

PATCH

/games/{gameId}

Update game.

---

DELETE

/games/{gameId}

Soft Delete.

---

POST

/games/{gameId}/publish

Publish game.

---

POST

/games/{gameId}/unpublish

Hide game.

---

# ==========================
# ANALYTICS
# ==========================

GET

/games/analytics

Teacher

Administrator

Return

- Most Played Games
- Average Score
- Completion Rate
- Average Duration
- XP Distribution
- Difficult Games

---

# ==========================
# VALIDATION
# ==========================

Validate

- Game Exists
- Student Enrollment
- Session Exists
- Duplicate Submission
- XP Eligibility

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Modify Scores
- Modify XP
- Submit Fake Results
- Access Hidden Games

All score calculations occur on the server.

---

# ==========================
# RATE LIMIT
# ==========================

Game Start

30 Requests / Minute

Progress Save

120 Requests / Minute

Game Submission

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

---

# ==========================
# PERFORMANCE
# ==========================

Game Loading

<300ms

Progress Save

<100ms

Game Submission

<500ms

Leaderboard

<300ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Game Created
- Game Updated
- Game Published
- Game Deleted
- Game Started
- Game Completed
- XP Awarded

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Game catalog loads.

✓ Game sessions work.

✓ Progress saving works.

✓ Game submission works.

✓ XP rewards work.

✓ Leaderboards work.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Educational Games API exists to make learning enjoyable while reinforcing educational objectives.

Every game must produce measurable educational value and must never compromise the integrity of the student's academic progress.

End of Document.