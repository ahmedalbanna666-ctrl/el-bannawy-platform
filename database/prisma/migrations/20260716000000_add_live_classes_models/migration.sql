-- CreateEnum
CREATE TYPE "live_session_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'OPEN', 'FULL', 'LIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "live_session_type" AS ENUM ('PRIVATE', 'GROUP');

-- CreateEnum
CREATE TYPE "live_booking_status" AS ENUM ('CONFIRMED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "live_attendance_status" AS ENUM ('JOINED', 'LATE', 'LEFT_EARLY', 'ABSENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "live_subscription_type" AS ENUM ('PRIVATE_MONTHLY', 'GROUP_MONTHLY', 'ONE_TIME_PRIVATE');

-- CreateEnum
CREATE TYPE "live_subscription_status" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "teacherId" UUID NOT NULL,
    "gradeId" UUID,
    "groupId" UUID,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxStudents" INTEGER,
    "availableSeats" INTEGER,
    "status" "live_session_status" NOT NULL DEFAULT 'DRAFT',
    "type" "live_session_type" NOT NULL DEFAULT 'PRIVATE',
    "meetingUrl" TEXT,
    "meetingPassword" TEXT,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "liveAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_bookings" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subscriptionId" UUID,
    "status" "live_booking_status" NOT NULL DEFAULT 'CONFIRMED',
    "rescheduleRequestedAt" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "live_subscription_type" NOT NULL,
    "packageLabel" TEXT NOT NULL DEFAULT '4',
    "packageSessionCount" INTEGER NOT NULL DEFAULT 4,
    "status" "live_subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "teacherId" UUID,
    "groupId" UUID,
    "sessionsTotal" INTEGER NOT NULL DEFAULT 0,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "live_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_attendance" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "live_attendance_status" NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "markedBy" TEXT NOT NULL DEFAULT 'AUTO',
    "markedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_availability" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "gradeId" UUID,
    "maxStudents" INTEGER NOT NULL DEFAULT 1,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_date_blocks" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "blockedDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_date_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_sessions_teacherId_idx" ON "live_sessions"("teacherId");

-- CreateIndex
CREATE INDEX "live_sessions_gradeId_idx" ON "live_sessions"("gradeId");

-- CreateIndex
CREATE INDEX "live_sessions_status_idx" ON "live_sessions"("status");

-- CreateIndex
CREATE INDEX "live_sessions_date_idx" ON "live_sessions"("date");

-- CreateIndex
CREATE INDEX "live_sessions_teacherId_date_idx" ON "live_sessions"("teacherId", "date");

-- CreateIndex
CREATE INDEX "live_bookings_sessionId_idx" ON "live_bookings"("sessionId");

-- CreateIndex
CREATE INDEX "live_bookings_studentId_idx" ON "live_bookings"("studentId");

-- CreateIndex
CREATE INDEX "live_bookings_studentId_status_idx" ON "live_bookings"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "live_bookings_sessionId_studentId_key" ON "live_bookings"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "live_subscriptions_userId_idx" ON "live_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "live_subscriptions_userId_status_idx" ON "live_subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "live_subscriptions_teacherId_idx" ON "live_subscriptions"("teacherId");

-- CreateIndex
CREATE INDEX "live_attendance_sessionId_idx" ON "live_attendance"("sessionId");

-- CreateIndex
CREATE INDEX "live_attendance_studentId_idx" ON "live_attendance"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "live_attendance_sessionId_studentId_key" ON "live_attendance"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "teacher_availability_teacherId_idx" ON "teacher_availability"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_availability_teacherId_dayOfWeek_idx" ON "teacher_availability"("teacherId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "teacher_date_blocks_teacherId_idx" ON "teacher_date_blocks"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_date_blocks_teacherId_blockedDate_key" ON "teacher_date_blocks"("teacherId", "blockedDate");

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_bookings" ADD CONSTRAINT "live_bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_bookings" ADD CONSTRAINT "live_bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_bookings" ADD CONSTRAINT "live_bookings_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "live_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_subscriptions" ADD CONSTRAINT "live_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_subscriptions" ADD CONSTRAINT "live_subscriptions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_attendance" ADD CONSTRAINT "live_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_attendance" ADD CONSTRAINT "live_attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_attendance" ADD CONSTRAINT "live_attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_date_blocks" ADD CONSTRAINT "teacher_date_blocks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
