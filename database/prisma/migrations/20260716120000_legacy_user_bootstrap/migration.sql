-- =============================================================================
-- Migration: 20260716120000_legacy_user_bootstrap
-- Purpose:    Convert legacy users (created outside the application's supported
--            creation flow) into fully supported application users by
--            back-filling the bootstrap artifacts that AuthService.register()
--            + BootstrapService.bootstrapNewStudent() always produce.
--
-- Detected STRUCTURALLY (no hardcoded IDs):
--   * App-created users ALWAYS have a coin_wallet and a notification_preference
--     row (created synchronously inside bootstrapNewStudent). Legacy users do
--     not. This missing-bootstrap-artifact signal is the primary detector.
--   * Corroborated by legacy indicators:
--       - legacy mobile pattern  (+20100000000x)
--       - legacy email pattern   (*@test.com)
--       - hardcoded sequential UUID pattern (e.g. 11111111-1111-...-11111111)
--
-- Guarantees (per requirements):
--   * id, relations, permissions, subscriptions, progress, achievements,
--     reports and history are PRESERVED (never deleted, never recreated).
--   * passwordHash, email, mobileNumber, role, status, academic context and
--     every other column on "users" are NOT modified.
--   * Idempotent: every statement uses INSERT ... ON CONFLICT DO NOTHING /
--     WHERE NOT EXISTS, so re-running produces zero changes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Materialize the set of legacy users structurally (reused below).
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _legacy_users_tmp;
CREATE TEMPORARY TABLE _legacy_users_tmp (id uuid);

INSERT INTO _legacy_users_tmp (id)
SELECT u.id
FROM users u
WHERE u."deletedAt" IS NULL
  -- Primary structural detector: app users always have these bootstrap rows.
  AND NOT EXISTS (
    SELECT 1 FROM "coin_wallets" cw WHERE cw."userId" = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "notification_preferences" np WHERE np."userId" = u.id
  )
  -- Corroborating legacy indicators (any one matches => legacy).
  AND (
    u."mobileNumber" ~ '^\+20100000000[0-9]$'
    OR u.email LIKE '%@test.com'
    OR (
      u.id::text ~ '^(\d)\1{7}-'                       -- 11111111-...
      OR u.id::text ~ '-([0-9a-f]{4})-\1{4}-\1{4}-'    -- -1111-1111-1111-
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Back-fill coin_wallet (balance 0) — mirrors bootstrapNewStudent.
-- ---------------------------------------------------------------------------
INSERT INTO "coin_wallets" ("id", "userId", "balance", "updatedAt")
SELECT gen_random_uuid(), lu.id, 0, now()
FROM _legacy_users_tmp lu
ON CONFLICT ("userId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Back-fill notification_preferences (app defaults) — mirrors bootstrap.
-- ---------------------------------------------------------------------------
INSERT INTO "notification_preferences" ("id", "userId", "updatedAt")
SELECT gen_random_uuid(), lu.id, now()
FROM _legacy_users_tmp lu
ON CONFLICT ("userId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Back-fill lesson_progress for the first published lesson, only if the
--    user has no lesson_progress yet — mirrors bootstrapNewStudent exactly.
-- ---------------------------------------------------------------------------
INSERT INTO "lesson_progress" ("id", "userId", "lessonId", "progress", "completed", "startedAt")
SELECT
  gen_random_uuid(),
  lu.id,
  (SELECT l."id" FROM "lessons" l WHERE l."published" = true ORDER BY l."displayOrder" ASC LIMIT 1),
  0,
  false,
  now()
FROM _legacy_users_tmp lu
WHERE NOT EXISTS (
  SELECT 1 FROM "lesson_progress" lp WHERE lp."userId" = lu.id
)
AND EXISTS (
  SELECT 1 FROM "lessons" l WHERE l."published" = true
)
ON CONFLICT ("userId", "lessonId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Mark legacy users as initialized so the application treats them as
--    fully bootstrapped (consistent with bootstrapNewStudent's intent).
--    Only flips false -> true; never touches a value already true.
-- ---------------------------------------------------------------------------
UPDATE users
SET "permissionsInitialized" = true,
    "updatedAt" = now()
WHERE "id" IN (SELECT id FROM _legacy_users_tmp)
  AND "permissionsInitialized" = false;

DROP TABLE IF EXISTS _legacy_users_tmp;
