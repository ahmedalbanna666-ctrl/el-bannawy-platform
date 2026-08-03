-- CreateTable: AiKnowledgeSource
CREATE TABLE "ai_knowledge_sources" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PDF',
    "url" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gradeId" UUID,
    "termId" UUID,
    "subject" TEXT DEFAULT 'english',
    "tags" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ai_knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for AiKnowledgeSource
CREATE INDEX "ai_knowledge_sources_gradeId_idx" ON "ai_knowledge_sources"("gradeId");
CREATE INDEX "ai_knowledge_sources_termId_idx" ON "ai_knowledge_sources"("termId");
CREATE INDEX "ai_knowledge_sources_status_idx" ON "ai_knowledge_sources"("status");
CREATE INDEX "ai_knowledge_sources_deletedAt_idx" ON "ai_knowledge_sources"("deletedAt");

-- AddForeignKey for AiKnowledgeSource -> Grade
ALTER TABLE "ai_knowledge_sources" ADD CONSTRAINT "ai_knowledge_sources_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for AiKnowledgeSource -> Term
ALTER TABLE "ai_knowledge_sources" ADD CONSTRAINT "ai_knowledge_sources_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AiKnowledgeChunk
CREATE TABLE "ai_knowledge_chunks" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "chunkIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AiKnowledgeChunk
CREATE INDEX "ai_knowledge_chunks_sourceId_idx" ON "ai_knowledge_chunks"("sourceId");

-- AddForeignKey for AiKnowledgeChunk -> AiKnowledgeSource
ALTER TABLE "ai_knowledge_chunks" ADD CONSTRAINT "ai_knowledge_chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ai_knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AiTeachingStyle
CREATE TABLE "ai_teaching_styles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Style',
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_teaching_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AiModelConfig
CREATE TABLE "ai_model_configs" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseUrl" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2000,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AiCreditPlan
CREATE TABLE "ai_credit_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "creditsPerQuestion" INTEGER NOT NULL DEFAULT 1,
    "creditsPerSession" INTEGER NOT NULL DEFAULT 10,
    "freeCredits" INTEGER NOT NULL DEFAULT 20,
    "resetPeriod" TEXT NOT NULL DEFAULT 'DAILY',
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_credit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StudentAiCredits
CREATE TABLE "student_ai_credits" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditsLimit" INTEGER NOT NULL DEFAULT 20,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_ai_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for StudentAiCredits
CREATE UNIQUE INDEX "student_ai_credits_userId_key" ON "student_ai_credits"("userId");
CREATE INDEX "student_ai_credits_planId_idx" ON "student_ai_credits"("planId");

-- AddForeignKey for StudentAiCredits -> User
ALTER TABLE "student_ai_credits" ADD CONSTRAINT "student_ai_credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for StudentAiCredits -> AiCreditPlan
ALTER TABLE "student_ai_credits" ADD CONSTRAINT "student_ai_credits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ai_credit_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: AiUsageLog
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID,
    "question" TEXT NOT NULL,
    "response" TEXT,
    "sourcesUsed" JSONB,
    "creditsConsumed" INTEGER NOT NULL DEFAULT 1,
    "responseTime" INTEGER,
    "modelUsed" TEXT,
    "provider" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for AiUsageLog
CREATE INDEX "ai_usage_logs_userId_idx" ON "ai_usage_logs"("userId");
CREATE INDEX "ai_usage_logs_conversationId_idx" ON "ai_usage_logs"("conversationId");
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- AddForeignKey for AiUsageLog -> User
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for AiUsageLog -> Conversation
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
