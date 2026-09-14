-- CreateTable
CREATE TABLE "google_auth_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "email" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "providerId" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_auth_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_auth_logs_userId_idx" ON "google_auth_logs"("userId");

-- CreateIndex
CREATE INDEX "google_auth_logs_email_idx" ON "google_auth_logs"("email");

-- CreateIndex
CREATE INDEX "google_auth_logs_createdAt_idx" ON "google_auth_logs"("createdAt");

-- CreateIndex
CREATE INDEX "google_auth_logs_success_idx" ON "google_auth_logs"("success");

-- AddForeignKey
ALTER TABLE "google_auth_logs" ADD CONSTRAINT "google_auth_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
