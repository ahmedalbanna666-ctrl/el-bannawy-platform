# CACHE_API.md

# El-bannawy Platform
## Cache API Specification

Version: 1.0.0

---

# Purpose

This document defines all caching rules, cache management endpoints and cache invalidation strategies used throughout the El-bannawy Platform.

The Cache API is responsible for improving application performance, reducing database load and accelerating frequently requested operations.

Redis is the official caching engine for Version 1.

---

# Base Endpoint

/api/v1/cache

---

# Authentication

Required

JWT Access Token

Administrator Role

Most endpoints are Internal APIs.

---

# Supported Roles

- Administrator

Internal Services

Students never access Cache APIs directly.

---

# ==========================
# CACHE STATUS
# ==========================

GET

/cache/status

Description

Return cache health.

Response

```json
{
    "status":"healthy",
    "provider":"Redis",
    "memoryUsage":"2.3 GB",
    "keys":54231,
    "uptime":"15 Days"
}
```

---

# ==========================
# CACHE STATISTICS
# ==========================

GET

/cache/stats

Description

Return cache metrics.

Includes

- Hits
- Misses
- Hit Ratio
- Memory Usage
- Connected Clients

---

# ==========================
# CLEAR CACHE
# ==========================

POST

/cache/clear

Description

Clear entire cache.

Administrator only.

Response

```json
{
    "success":true,
    "clearedKeys":54231
}
```

---

# ==========================
# CLEAR MODULE CACHE
# ==========================

POST

/cache/clear/module

Description

Clear cache for one module.

Request

```json
{
    "module":"curriculum"
}
```

Supported Modules

- Curriculum
- Lessons
- Vocabulary
- Story
- Reports
- Analytics
- Dashboard

---

# ==========================
# REFRESH CACHE
# ==========================

POST

/cache/refresh

Description

Refresh cache.

Response

```json
{
    "success":true
}
```

---

# ==========================
# CACHE KEYS
# ==========================

GET

/cache/keys

Administrator

Return cached keys.

Filters

- Prefix
- Module

---

# ==========================
# CACHE DETAILS
# ==========================

GET

/cache/keys/{key}

Return

- Key
- TTL
- Size
- Last Access

---

# ==========================
# CACHE INVALIDATION
# ==========================

POST

/cache/invalidate

Description

Invalidate cache entry.

Request

```json
{
    "key":"lesson:125"
}
```

---

# ==========================
# PRELOAD CACHE
# ==========================

POST

/cache/preload

Description

Preload frequently accessed data.

Examples

- Dashboard

- Units

- Lessons

- Vocabulary

---

# ==========================
# CACHE POLICIES
# ==========================

Default TTL

15 Minutes

Dashboard

5 Minutes

Lessons

30 Minutes

Vocabulary

60 Minutes

Reports

10 Minutes

Analytics

5 Minutes

Leaderboards

2 Minutes

---

# ==========================
# AUTOMATIC INVALIDATION
# ==========================

Cache is automatically cleared when:

- Lesson Updated
- Vocabulary Updated
- Homework Updated
- Quiz Updated
- Student Progress Updated
- Reports Generated

---

# ==========================
# VALIDATION
# ==========================

Validate

- Cache Exists

- Module Exists

- Key Exists

- Administrator Permission

---

# ==========================
# SECURITY
# ==========================

Students cannot access cache.

Teachers cannot clear cache.

Only administrators and internal services may perform cache operations.

---

# ==========================
# STATUS CODES
# ==========================

200 OK

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Cache Lookup

<5ms

Cache Write

<10ms

Cache Refresh

<100ms

Full Cache Clear

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Cache Cleared

- Cache Refreshed

- Cache Invalidated

- Cache Preloaded

- Policy Updated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Cache health works.

✓ Statistics work.

✓ Cache clearing works.

✓ Module invalidation works.

✓ Automatic invalidation works.

✓ Preloading works.

✓ Audit logging works.

✓ Authorization works.

---

# Final Rule

Caching is an implementation detail that must never affect business logic.

If cached data conflicts with the database, the database is always considered the single source of truth.

End of Document.