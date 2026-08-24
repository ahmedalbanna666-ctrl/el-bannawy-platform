-- CreateTable
CREATE TABLE "pronunciation_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expectedText" TEXT NOT NULL,
    "transcript" TEXT,
    "audioUrl" TEXT,
    "audioFormat" TEXT,
    "durationMs" INTEGER,
    "overallScore" INTEGER,
    "accuracy" INTEGER,
    "fluency" INTEGER,
    "prosody" INTEGER,
    "completeness" INTEGER,
    "engine" TEXT NOT NULL DEFAULT 'gopt',
    "phonemes" TEXT,
    "wordFeedback" JSONB,
    "phonemeFeedback" JSONB,
    "rawResult" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pronunciation_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "pronunciation_attempts_userId_idx" ON "pronunciation_attempts" ("userId");

-- CreateIndex
CREATE INDEX "pronunciation_attempts_userId_createdAt_idx" ON "pronunciation_attempts" ("userId", "createdAt");
