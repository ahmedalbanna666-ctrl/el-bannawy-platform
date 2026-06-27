# USERS_API.md

# El-bannawy Platform
## Users API Specification

Version: 1.0.0

---

# Purpose

This document defines all User Management API endpoints used throughout the El-bannawy Platform.

These APIs are responsible for managing user accounts, profiles, roles, permissions and account settings.

Only authenticated users can access these endpoints unless explicitly stated otherwise.

---

# Base Endpoint

/api/v1/users

---

# Authentication

All endpoints require:

JWT Access Token

Role-Based Authorization (RBAC)

---

# Supported Roles

- Student
- Teacher
- Secretary
- Support
- Administrator

Each role has different permissions.

---

# Endpoint

GET

/users/me

Description

Return the authenticated user's profile.

Authentication

Required

Response

200 OK

```json
{
  "success": true,
  "data": {
    "id": "",
    "fullName": "",
    "mobile": "",
    "role": "",
    "grade": "",
    "stage": "",
    "profileImage": ""
  }
}
```

---

# Endpoint

PATCH

/users/me

Description

Update authenticated user's profile.

Authentication

Required

Editable Fields

- Full Name
- Mobile Number
- Profile Picture

Students cannot modify:

- Grade
- Educational Stage
- Student ID

---

# Endpoint

PATCH

/users/me/password

Description

Change password.

Authentication

Required

Request

```json
{
  "currentPassword": "",
  "newPassword": "",
  "confirmPassword": ""
}
```

---

# Endpoint

POST

/users/me/avatar

Description

Upload profile image.

Authentication

Required

Supported Formats

- JPG
- PNG
- WEBP

Maximum Size

5 MB

---

# Endpoint

GET

/users

Description

Retrieve paginated users.

Authentication

Administrator

Teacher (Limited)

Secretary (Limited)

Filters

- Role
- Grade
- Stage
- Status
- Search

---

# Endpoint

GET

/users/{id}

Description

Retrieve a specific user.

Authentication

Administrator

Teacher (Assigned Students Only)

Secretary (Administrative Information Only)

---

# Endpoint

POST

/users

Description

Create a new user.

Authentication

Administrator

Secretary

Supported Roles

- Student
- Teacher
- Secretary
- Support

Administrators may create administrator accounts.

---

# Endpoint

PATCH

/users/{id}

Description

Update user information.

Authentication

Administrator

Secretary (Limited)

---

# Endpoint

DELETE

/users/{id}

Description

Soft delete user.

Authentication

Administrator

User records should never be permanently deleted.

---

# Endpoint

PATCH

/users/{id}/status

Description

Update account status.

Possible Values

- Active
- Suspended
- Pending
- Deleted

Authentication

Administrator

---

# Endpoint

PATCH

/users/{id}/grade

Description

Assign educational stage and grade.

Authentication

Administrator

Secretary

Students cannot modify these values.

---

# Endpoint

PATCH

/users/{id}/reset-password

Description

Reset user password.

Authentication

Administrator

Secretary

---

# Endpoint

GET

/users/{id}/activity

Description

Retrieve recent activity.

Authentication

Administrator

Teacher (Assigned Students)

---

# Endpoint

GET

/users/{id}/progress

Description

Retrieve learning progress.

Authentication

Administrator

Teacher

Student (Own Data)

---

# Endpoint

GET

/users/{id}/reports

Description

Retrieve user reports.

Authentication

Administrator

Teacher

Student (Own Reports)

Parent (Linked Student Only)

---

# Pagination

Supported Parameters

- page
- limit
- search
- sort
- order

Maximum Limit

100

---

# Validation

Validate

- Mobile Number
- Full Name
- Role
- Grade
- Stage
- Image Format
- Password Policy

---

# Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# Security

Every endpoint requires:

- JWT Authentication
- Role Authorization
- Input Validation
- Audit Logging

Sensitive information must never be exposed.

Passwords are never returned.

---

# Audit Logging

Record:

- User Created
- User Updated
- Password Reset
- Status Changed
- Grade Changed
- Profile Updated

---

# Performance

Target Response Time

Less than 300ms

Large datasets must use pagination.

---

# Acceptance Criteria

✓ Profile retrieval works.

✓ Profile update works.

✓ Password change works.

✓ Avatar upload works.

✓ User management works.

✓ Grade assignment works.

✓ Status updates work.

✓ Audit logging works.

✓ Authorization rules are enforced.

---

# Final Rule

User Management APIs are responsible only for identity and profile management.

Educational progress, payments, XP and Coins must remain in their own dedicated modules.

End of Document.