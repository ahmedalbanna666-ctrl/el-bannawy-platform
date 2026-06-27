# AUTHENTICATION_API.md

# El-bannawy Platform
## Authentication API Specification

Version: 1.0.0

---

# Purpose

This document defines every Authentication API endpoint used by the El-bannawy Platform.

Authentication APIs are responsible for:

- Registration
- Login
- Logout
- Refresh Tokens
- Password Reset
- Session Management

---

# Base Endpoint

/api/v1/auth

---

# Authentication

Public Endpoints

- Register
- Login
- Forgot Password
- Reset Password

Protected Endpoints

Require JWT Access Token.

---

# Endpoint

POST

/auth/register

Description

Create a new student account.

Authentication

No

Request

{
  "fullName": "",
  "mobile": "",
  "password": "",
  "confirmPassword": ""
}

Response

201 Created

{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "userId": "",
    "status": "pending_verification"
  }
}

Validation

- Mobile must be unique.
- Password must satisfy policy.
- Confirm Password must match.

---

# Endpoint

POST

/auth/login

Authentication

No

Request

{
  "mobile": "",
  "password": ""
}

Response

200 OK

{
  "success": true,
  "data": {
    "accessToken": "",
    "refreshToken": "",
    "expiresIn": 3600
  }
}

Errors

401 Unauthorized

429 Too Many Requests

---

# Endpoint

POST

/auth/logout

Authentication

Required

Description

Invalidate current session.

Response

204 No Content

---

# Endpoint

POST

/auth/refresh-token

Authentication

Refresh Token

Request

{
  "refreshToken": ""
}

Response

New Access Token

---

# Endpoint

POST

/auth/forgot-password

Authentication

No

Request

{
  "mobile": ""
}

Response

Verification Code Sent

---

# Endpoint

POST

/auth/reset-password

Authentication

No

Request

{
  "mobile": "",
  "verificationCode": "",
  "newPassword": ""
}

Response

Password Updated

---

# Endpoint

GET

/auth/me

Authentication

Required

Description

Return authenticated user profile.

---

# Endpoint

GET

/auth/sessions

Authentication

Required

Description

Return active sessions.

---

# Endpoint

DELETE

/auth/sessions/{id}

Authentication

Required

Description

Terminate one session.

---

# Security

JWT

Refresh Tokens

HTTPS

Rate Limiting

Password Hashing

---

# Validation

Validate:

- Mobile
- Password
- Verification Code
- Refresh Token

---

# Status Codes

200

201

204

400

401

403

404

409

422

429

500

---

# Acceptance Criteria

✓ Register works.

✓ Login works.

✓ Logout works.

✓ Refresh Token works.

✓ Password Reset works.

✓ Sessions work.

✓ JWT validation works.

---

# Final Rule

Every protected endpoint must verify authentication before executing business logic.

End of Document.