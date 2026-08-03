-- AlterTable
ALTER TABLE "ai_credit_plans" ADD COLUMN     "dailyLimit" INTEGER,
ADD COLUMN     "monthlyLimit" INTEGER,
ADD COLUMN     "weeklyLimit" INTEGER;

-- AlterTable
ALTER TABLE "ai_knowledge_sources" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ai_model_configs" ADD COLUMN     "healthStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastHealthCheckAt" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportsStreaming" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ai_teaching_styles" ADD COLUMN     "arabicUsage" TEXT NOT NULL DEFAULT 'BALANCED',
ADD COLUMN     "correctionStyle" TEXT,
ADD COLUMN     "difficultyLevel" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
ADD COLUMN     "emojiPolicy" TEXT NOT NULL DEFAULT 'MODERATE',
ADD COLUMN     "encouragementPhrases" TEXT,
ADD COLUMN     "englishUsage" TEXT NOT NULL DEFAULT 'BALANCED',
ADD COLUMN     "examplesPolicy" TEXT NOT NULL DEFAULT 'ALWAYS',
ADD COLUMN     "explanationStyle" TEXT,
ADD COLUMN     "greetingStyle" TEXT,
ADD COLUMN     "hintsPolicy" TEXT NOT NULL DEFAULT 'SCAFFOLDED',
ADD COLUMN     "responseLength" TEXT NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "ai_usage_logs" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "feedbackComment" TEXT,
ADD COLUMN     "feedbackRating" INTEGER,
ADD COLUMN     "streamed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "conversation_messages" ADD COLUMN     "isError" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_ai_credits" ADD COLUMN     "packageId" UUID;

-- CreateTable
CREATE TABLE "ai_packages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'FREE',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "creditsPerQuestion" INTEGER NOT NULL DEFAULT 1,
    "creditsPerSession" INTEGER NOT NULL DEFAULT 10,
    "freeCredits" INTEGER NOT NULL DEFAULT 20,
    "resetPeriod" TEXT NOT NULL DEFAULT 'DAILY',
    "dailyLimit" INTEGER,
    "weeklyLimit" INTEGER,
    "monthlyLimit" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "modelAccess" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "restrictions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creditPlanId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "variables" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "variables" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_moderation_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "inputSnippet" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_packages_isActive_idx" ON "ai_packages"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_templates_key_key" ON "ai_prompt_templates"("key");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_isActive_idx" ON "ai_prompt_templates"("isActive");

-- CreateIndex
CREATE INDEX "ai_prompt_versions_templateId_idx" ON "ai_prompt_versions"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_versions_templateId_version_key" ON "ai_prompt_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "ai_feedback_messageId_idx" ON "ai_feedback"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_feedback_messageId_userId_key" ON "ai_feedback"("messageId", "userId");

-- CreateIndex
CREATE INDEX "ai_moderation_logs_createdAt_idx" ON "ai_moderation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_moderation_logs_action_idx" ON "ai_moderation_logs"("action");

-- AddForeignKey
ALTER TABLE "student_ai_credits" ADD CONSTRAINT "student_ai_credits_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ai_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_packages" ADD CONSTRAINT "ai_packages_creditPlanId_fkey" FOREIGN KEY ("creditPlanId") REFERENCES "ai_credit_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ai_prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
