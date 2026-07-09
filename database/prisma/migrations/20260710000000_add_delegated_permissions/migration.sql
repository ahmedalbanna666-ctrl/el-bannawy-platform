-- Add delegated permission system

-- Teacher → Staff ownership
ALTER TABLE "users" ADD COLUMN "managedByTeacherId" UUID;
CREATE INDEX "users_managedByTeacherId_idx" ON "users"("managedByTeacherId");
ALTER TABLE "users" ADD CONSTRAINT "users_managedByTeacherId_fkey"
    FOREIGN KEY ("managedByTeacherId") REFERENCES "users"("id");

-- User permission grants
CREATE TABLE "user_permission_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_permission_grants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_permission_grants_userId_permission_key" UNIQUE ("userId", "permission")
);
CREATE INDEX "user_permission_grants_userId_idx" ON "user_permission_grants"("userId");
CREATE INDEX "user_permission_grants_grantedByUserId_idx" ON "user_permission_grants"("grantedByUserId");
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_grantedByUserId_fkey"
    FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE CASCADE;
