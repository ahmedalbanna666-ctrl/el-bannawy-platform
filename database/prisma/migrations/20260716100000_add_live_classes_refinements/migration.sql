-- Migration: Add Live Classes Refinements

-- Step 1: Create MeetingProvider enum
CREATE TYPE "meeting_provider" AS ENUM ('EXTERNAL_URL', 'ZOOM_SDK');

-- Step 2: Add new columns to live_sessions
ALTER TABLE "live_sessions"
  ADD COLUMN "availabilitySlotId" UUID,
  ADD COLUMN "meetingProvider" "meeting_provider" NOT NULL DEFAULT 'EXTERNAL_URL';

-- Step 3: Add foreign key for availabilitySlotId
ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_availabilitySlotId_fkey"
  FOREIGN KEY ("availabilitySlotId") REFERENCES "teacher_availability"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Add index for availabilitySlotId
CREATE INDEX "live_sessions_availabilitySlotId_idx" ON "live_sessions"("availabilitySlotId");

-- Step 5: Add deletedAt to teacher_availability
ALTER TABLE "teacher_availability"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 6: Add deletedAt to teacher_date_blocks
ALTER TABLE "teacher_date_blocks"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 7: Create teacher_live_settings table
CREATE TABLE "teacher_live_settings" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "defaultMeetingUrl" TEXT,
    "meetingPassword" TEXT,
    "meetingProvider" "meeting_provider" NOT NULL DEFAULT 'EXTERNAL_URL',
    "allowOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_live_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_live_settings_teacherId_key" UNIQUE ("teacherId"),
    CONSTRAINT "teacher_live_settings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 8: Add index for teacher_live_settings
CREATE INDEX "teacher_live_settings_teacherId_idx" ON "teacher_live_settings"("teacherId");

-- Step 9: Add type column to teacher_availability
ALTER TABLE "teacher_availability"
  ADD COLUMN "type" "live_session_type" NOT NULL DEFAULT 'PRIVATE';
