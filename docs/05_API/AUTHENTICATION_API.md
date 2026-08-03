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
  "email": "",
  "mobile": "",
  "password": "",
  "confirmPassword": ""
}

Response

201 Created

{
  "success": true,
  "message": "Account created. Please verify your email.",
  "data": {
    "userId": "",
    "requiresEmailVerification": true
  }
}

Validation

- Email must be unique and a valid email address.
- Mobile (optional) must be unique if provided.
- Password must satisfy policy.
- Confirm Password must match.

---

# Endpoint

POST

/auth/verify-email

Description

Confirm the email address with the 6-digit verification code sent to the registered email. On success the account status becomes ACTIVE.

Authentication

No

Request

{
  "email": "",
  "code": "123456"
}

Response

200 OK

{
  "success": true,
  "data": {
    "verified": true,
    "email": ""
  }
}

---

# Endpoint

POST

/auth/resend-verification

Description

Re-send the email verification code (rate-limited).

Authentication

No

Request

{
  "email": ""
}

Response

200 OK

{
  "success": true,
  "data": {
    "sent": true
  }
}

---

# Endpoint

POST

/auth/firebase-login

Description

Log in with a Firebase Authentication ID token (email/password sign-in on the client). The backend verifies the token with the Firebase Admin SDK and issues the platform JWT. The account must already be email-verified.

Authentication

No

Request

{
  "idToken": "",
  "rememberMe": false
}

Response

200 OK

{
  "success": true,
  "data": {
    "userId": ""
  }
}

Errors

401 Unauthorized (invalid token or unverified email)

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

- Email
- Mobile (optional)
- Password
- Verification Code
- Refresh Token
- Firebase ID Token

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