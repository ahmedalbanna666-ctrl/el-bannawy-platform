-- Phase 1B — Live Classes V2 migration plan
-- M2: LiveWaitingList table (PMS §7.3)
-- M3: LiveBooking reschedule decision fields (PMS §7.4)
-- M4: Notification scheduledAt/sentAt columns (PMS §9.3)
-- M5: LiveRefund ledger table (PMS §7.5 / §8.5)
-- M6: Payment.couponId referential integrity (FK -> Coupon)

-- CreateEnum
CREATE TYPE "live_waiting_list_status" AS ENUM ('WAITING', 'PROMOTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "live_booking_reschedule_status" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "live_refund_status" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED');

-- AlterTable (M3)
ALTER TABLE "live_bookings" ADD COLUMN     "rescheduleResolvedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduleResolvedById" UUID,
ADD COLUMN     "rescheduleStatus" "live_booking_reschedule_status";

-- AlterTable (M4)
ALTER TABLE "notifications" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- AlterTable (M6): couponId is a plain TEXT column today; cast in place to UUID so the FK below binds.
ALTER TABLE "payments" ALTER COLUMN "couponId" SET DATA TYPE UUID USING "couponId"::uuid;

-- CreateTable (M2)
CREATE TABLE "live_waiting_lists" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "live_waiting_list_status" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_waiting_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable (M5)
CREATE TABLE "live_refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "reason" TEXT,
    "status" "live_refund_status" NOT NULL DEFAULT 'PENDING',
    "processedById" UUID,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (M2)
CREATE INDEX "live_waiting_lists_sessionId_status_idx" ON "live_waiting_lists"("sessionId", "status");

-- CreateIndex (M2)
CREATE INDEX "live_waiting_lists_sessionId_joinedAt_idx" ON "live_waiting_lists"("sessionId", "joinedAt");

-- CreateIndex (M2)
CREATE INDEX "live_waiting_lists_studentId_idx" ON "live_waiting_lists"("studentId");

-- CreateIndex (M2)
CREATE UNIQUE INDEX "live_waiting_lists_sessionId_studentId_key" ON "live_waiting_lists"("sessionId", "studentId");

-- CreateIndex (M5)
CREATE INDEX "live_refunds_userId_idx" ON "live_refunds"("userId");

-- CreateIndex (M5)
CREATE INDEX "live_refunds_userId_status_idx" ON "live_refunds"("userId", "status");

-- CreateIndex (M5)
CREATE INDEX "live_refunds_status_idx" ON "live_refunds"("status");

-- CreateIndex (M5)
CREATE INDEX "live_refunds_createdAt_idx" ON "live_refunds"("createdAt");

-- CreateIndex (M5)
CREATE UNIQUE INDEX "live_refunds_paymentId_key" ON "live_refunds"("paymentId");

-- CreateIndex (M3)
CREATE INDEX "live_bookings_sessionId_status_idx" ON "live_bookings"("sessionId", "status");

-- CreateIndex (M3)
CREATE INDEX "live_bookings_rescheduleStatus_idx" ON "live_bookings"("rescheduleStatus");

-- CreateIndex (M4)
CREATE INDEX "notifications_scheduledAt_idx" ON "notifications"("scheduledAt");

-- CreateIndex (M4)
CREATE INDEX "notifications_userId_scheduledAt_idx" ON "notifications"("userId", "scheduledAt");

-- AddForeignKey (M6)
ALTER TABLE "payments" ADD CONSTRAINT "payments_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (M3)
ALTER TABLE "live_bookings" ADD CONSTRAINT "live_bookings_rescheduleResolvedById_fkey" FOREIGN KEY ("rescheduleResolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (M2)
ALTER TABLE "live_waiting_lists" ADD CONSTRAINT "live_waiting_lists_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M2)
ALTER TABLE "live_waiting_lists" ADD CONSTRAINT "live_waiting_lists_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M5)
ALTER TABLE "live_refunds" ADD CONSTRAINT "live_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M5)
ALTER TABLE "live_refunds" ADD CONSTRAINT "live_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M5)
ALTER TABLE "live_refunds" ADD CONSTRAINT "live_refunds_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
