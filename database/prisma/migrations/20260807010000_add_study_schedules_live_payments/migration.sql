-- Live Schedules + Live Payment approval
-- 1) StudySchedule table (teacher-created recurring study schedules)
-- 2) TeacherAvailability.scheduleId (day-rows belong to a schedule)
-- 3) LiveSubscription.scheduleId (group/plan subscriptions bind to a schedule)
-- 4) Payment.metadata + Instapay manual proof fields
-- 5) LiveSubscriptionType enum expanded with the 4 plan products

-- AlterEnum (append new values; safe additive change)
ALTER TYPE "live_subscription_type" ADD VALUE 'PRIVATE_PLAN_A';
ALTER TYPE "live_subscription_type" ADD VALUE 'PRIVATE_PLAN_B';
ALTER TYPE "live_subscription_type" ADD VALUE 'GROUP_PLAN_A';
ALTER TYPE "live_subscription_type" ADD VALUE 'GROUP_PLAN_B';

-- CreateTable
CREATE TABLE "study_schedules" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "live_session_type" NOT NULL DEFAULT 'PRIVATE',
    "maxStudents" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "study_schedules_pkey" PRIMARY KEY ("id")
);

-- AlterTable (Payment)
ALTER TABLE "payments" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "proofGatewayRef" TEXT,
ADD COLUMN     "proofSenderNumber" TEXT,
ADD COLUMN     "proofTransactionRef" TEXT,
ADD COLUMN     "proofScreenshot" TEXT,
ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "reviewedById" UUID,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable (TeacherAvailability)
ALTER TABLE "teacher_availability" ADD COLUMN     "scheduleId" UUID;

-- AlterTable (LiveSubscription)
ALTER TABLE "live_subscriptions" ADD COLUMN     "scheduleId" UUID;

-- CreateIndex
CREATE INDEX "study_schedules_teacherId_idx" ON "study_schedules"("teacherId");

-- CreateIndex
CREATE INDEX "study_schedules_teacherId_isActive_idx" ON "study_schedules"("teacherId", "isActive");

-- CreateIndex
CREATE INDEX "study_schedules_type_idx" ON "study_schedules"("type");

-- CreateIndex
CREATE INDEX "teacher_availability_scheduleId_idx" ON "teacher_availability"("scheduleId");

-- CreateIndex
CREATE INDEX "live_subscriptions_scheduleId_idx" ON "live_subscriptions"("scheduleId");

-- AddForeignKey
ALTER TABLE "study_schedules" ADD CONSTRAINT "study_schedules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "study_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_subscriptions" ADD CONSTRAINT "live_subscriptions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "study_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
