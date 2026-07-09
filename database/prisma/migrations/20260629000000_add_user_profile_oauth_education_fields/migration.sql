-- AlterTable: users — add profile, OAuth, and education fields
-- These fields were introduced between the initial migration set (20260628)
-- and HEAD, applied via prisma db push but never captured in a migration.

ALTER TABLE "users" ALTER COLUMN "mobileNumber" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "englishName" TEXT;
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "parentMobile" TEXT;
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN "appleId" TEXT;
ALTER TABLE "users" ADD COLUMN "oauthProvider" TEXT;
ALTER TABLE "users" ADD COLUMN "educationalSystem" TEXT;
ALTER TABLE "users" ADD COLUMN "educationalStage" TEXT;
ALTER TABLE "users" ADD COLUMN "grade" TEXT;
ALTER TABLE "users" ADD COLUMN "academicTerm" TEXT;
ALTER TABLE "users" ADD COLUMN "governorate" TEXT;
ALTER TABLE "users" ADD COLUMN "school" TEXT;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");
