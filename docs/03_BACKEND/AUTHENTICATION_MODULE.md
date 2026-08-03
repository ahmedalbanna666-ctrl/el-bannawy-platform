# Authentication Module

Version: 2.1.0
Source: `apps/backend/src/auth`

## Implemented Flows

- Register with full name, **required email**, optional mobile, password, and optional academic/profile data.
- **Email verification**: a 6-digit code is sent to the registered email (via Brevo) and the account stays `PENDING_VERIFICATION` until the code is confirmed (`/auth/verify-email`).
- Login is blocked until the email has been verified.
- **Firebase Authentication (hybrid)**: the frontend signs in with Firebase email/password and submits the ID token to `/auth/firebase-login`. The backend verifies the token with the Firebase Admin SDK and issues the platform JWT, preserving the existing sessions/permissions/refresh-token model. `/auth/login` (bcrypt, email or mobile) remains supported for existing accounts and mobile-only users.
- JWT access token and persisted refresh token issuance.
- Logout with session/token invalidation.
- Refresh token rotation/revocation behavior.
- Forgot-password and reset-password verification-code flow.
- Google OAuth start/callback and completion of OAuth registration.
- Authenticated user profile (`/auth/me`) and session list/deletion.

## Roles

The database supports student, teacher, staff, secretary, support, and administrator. Effective shared permissions currently cover student, teacher, staff, and administrator; see `docs/00_PROJECT_OVERVIEW/USER_ROLES.md`.

## Endpoint Prefix

`/api/v1/auth`: `register`, `verify-email`, `resend-verification`, `firebase-login`, `login`, `google`, `google/callback`, `complete-oauth-registration`, `logout`, `refresh-token`, `forgot-password`, `reset-password`, `me`, `sessions`, and `sessions/:id`.

## Registration & Verification Flow

1. Client calls `/auth/register` with `fullName`, `email`, optional `mobile`, `password`, `confirmPassword` and profile fields. A `firebaseIdToken` may be included if the client already created the Firebase Auth user.
2. The backend creates the user with status `PENDING_VERIFICATION`, generates a 6-digit code, persists it in `email_verifications`, and emails it via Brevo.
3. If a Firebase token was provided and Firebase reports the email verified, the account is activated immediately; otherwise the code must be confirmed.
4. Client calls `/auth/verify-email` with `{ email, code }` → the user is set to `ACTIVE` with `emailVerifiedAt`.
5. Client calls `/auth/firebase-login` with `{ idToken }` (Firebase sign-in) or `/auth/login` with email/mobile + password (bcrypt) to obtain the platform tokens.

## Environment Variables

- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` — Brevo transactional email for verification codes.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin (used for both FCM and verifying Firebase Auth ID tokens).

## Security Controls

- Passwords are hashed with bcryptjs.
- JWT configuration is loaded from validated environment variables.
- Protected routes use `JwtAuthGuard`.
- Login history is persisted.
- Sessions and refresh tokens can be revoked.
- Email verification codes are 6 digits, expire after 15 minutes, and are rate-limited (max 3 pending per user).
- Firebase ID tokens are verified server-side with the Firebase Admin SDK before a platform JWT is issued.

## Open Hardening

- Add endpoint throttling and abuse controls.
- Replace OAuth token query-string handoff with a secure cookie or one-time exchange.
- Verify all identity/password DTO combinations and registration edge cases.
- Avoid logging verification codes or sensitive authentication data.
- Add resend-cooldown timing to the email verification flow.

End of Document.
