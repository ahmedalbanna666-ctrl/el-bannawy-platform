-- AlterTable: add AI provider API type (OPENAI_RESPONSES / OPENAI_COMPATIBLE_CHAT)
ALTER TABLE "ai_model_configs" ADD COLUMN "apiType" TEXT DEFAULT 'OPENAI_COMPATIBLE_CHAT';

-- Backfill: existing configs that already point at a /chat/completions full URL are OpenAI-compatible chat.
UPDATE "ai_model_configs"
SET "apiType" = 'OPENAI_COMPATIBLE_CHAT'
WHERE "apiType" IS NULL;
