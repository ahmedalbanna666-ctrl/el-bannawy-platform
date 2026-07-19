-- CreateTable
CREATE TABLE "coin_packages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coinAmount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_purchases" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "paymentId" UUID,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlock_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unlock_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_redemptions" (
    "id" UUID NOT NULL,
    "codeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_unlocks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "unlockMethod" TEXT NOT NULL,
    "coinAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlock_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unlock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_announcements" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_control_logs" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_session_control_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_purchases_userId_idx" ON "coin_purchases"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "unlock_codes_code_key" ON "unlock_codes"("code");

-- CreateIndex
CREATE INDEX "unlock_codes_code_idx" ON "unlock_codes"("code");

-- CreateIndex
CREATE INDEX "code_redemptions_userId_idx" ON "code_redemptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "code_redemptions_codeId_userId_key" ON "code_redemptions"("codeId", "userId");

-- CreateIndex
CREATE INDEX "content_unlocks_userId_idx" ON "content_unlocks"("userId");

-- CreateIndex
CREATE INDEX "content_unlocks_targetType_targetId_idx" ON "content_unlocks"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "content_unlocks_userId_targetType_targetId_key" ON "content_unlocks"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "unlock_requests_userId_idx" ON "unlock_requests"("userId");

-- CreateIndex
CREATE INDEX "unlock_requests_status_idx" ON "unlock_requests"("status");

-- CreateIndex
CREATE INDEX "live_announcements_sessionId_idx" ON "live_announcements"("sessionId");

-- CreateIndex
CREATE INDEX "live_announcements_sessionId_createdAt_idx" ON "live_announcements"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "live_session_control_logs_sessionId_idx" ON "live_session_control_logs"("sessionId");

-- CreateIndex
CREATE INDEX "live_session_control_logs_sessionId_createdAt_idx" ON "live_session_control_logs"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "coin_purchases" ADD CONSTRAINT "coin_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_purchases" ADD CONSTRAINT "coin_purchases_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "coin_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlock_codes" ADD CONSTRAINT "unlock_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_redemptions" ADD CONSTRAINT "code_redemptions_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "unlock_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_redemptions" ADD CONSTRAINT "code_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_unlocks" ADD CONSTRAINT "content_unlocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlock_requests" ADD CONSTRAINT "unlock_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlock_requests" ADD CONSTRAINT "unlock_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_announcements" ADD CONSTRAINT "live_announcements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_announcements" ADD CONSTRAINT "live_announcements_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_control_logs" ADD CONSTRAINT "live_session_control_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_control_logs" ADD CONSTRAINT "live_session_control_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
