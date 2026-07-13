-- Add explicit permission initialization state to the User model.
--
-- This distinguishes a "legacy uninitialized teacher" (one that was created
-- before explicit delegated-permission initialization existed, and therefore
-- has never had a persisted grant set) from a teacher that has been
-- "intentionally revoked to zero permissions" by an administrator.
--
-- The legacy case is handled by a one-time, idempotent backfill that seeds the
-- teacher's default capability ceiling as persisted grants and flips this flag.
-- The intentionally-zero case must persist and must NEVER be restored at
-- runtime by a grant-row-count heuristic.
--
-- Effective delegated permissions are always computed as:
--   explicit persisted grants INTERSECT capability ceiling
-- with no empty-grant fallback to the ceiling.

ALTER TABLE "users" ADD COLUMN "permissionsInitialized" BOOLEAN NOT NULL DEFAULT false;
