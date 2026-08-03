-- AlterTable: AI token & cost accounting
ALTER TABLE "ai_usage_logs" ADD COLUMN "tokensTotal" INTEGER;
ALTER TABLE "ai_usage_logs" ADD COLUMN "embeddingTokens" INTEGER;
ALTER TABLE "ai_usage_logs" ADD COLUMN "cachedTokens" INTEGER;
ALTER TABLE "ai_usage_logs" ADD COLUMN "cachedReadTokens" INTEGER;
ALTER TABLE "ai_usage_logs" ADD COLUMN "cachedWriteTokens" INTEGER;
ALTER TABLE "ai_usage_logs" ADD COLUMN "requestCost" DECIMAL(12,6);
ALTER TABLE "ai_usage_logs" ADD COLUMN "responseCost" DECIMAL(12,6);
ALTER TABLE "ai_usage_logs" ADD COLUMN "embeddingCost" DECIMAL(12,6);
ALTER TABLE "ai_usage_logs" ADD COLUMN "cacheCost" DECIMAL(12,6);
ALTER TABLE "ai_usage_logs" ADD COLUMN "totalCost" DECIMAL(12,6);
ALTER TABLE "ai_usage_logs" ADD COLUMN "currency" TEXT DEFAULT 'USD';

CREATE INDEX "ai_usage_logs_provider_idx" ON "ai_usage_logs"("provider");
