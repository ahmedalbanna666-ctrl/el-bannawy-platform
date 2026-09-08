-- Per-grade WhatsApp sender numbers (multi-number support for ban avoidance)
-- plus sender tracking on the message log. Additive only: safe for production.

CREATE TABLE IF NOT EXISTS "whatsapp_senders" (
  "id" UUID NOT NULL,
  "gradeId" UUID NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "phoneNumber" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "apiUrl" TEXT,
  "apiKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_senders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_senders_gradeId_key" ON "whatsapp_senders"("gradeId");

DO $$ BEGIN
  ALTER TABLE "whatsapp_senders" ADD CONSTRAINT "whatsapp_senders_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "senderPhone" TEXT;
