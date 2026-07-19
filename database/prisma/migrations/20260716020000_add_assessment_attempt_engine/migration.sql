-- CreateEnum
CREATE TYPE "assessment_attempt_status" AS ENUM ('STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'CANCELLED', 'ABANDONED', 'COMPLETED');

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "assessment_attempt_status" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER,
    "score" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" JSONB,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "maxScore" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_attempts_assessmentId_idx" ON "assessment_attempts"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_attempts_studentId_idx" ON "assessment_attempts"("studentId");

-- CreateIndex
CREATE INDEX "assessment_attempts_status_idx" ON "assessment_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_assessmentId_studentId_attemptNumber_key" ON "assessment_attempts"("assessmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "assessment_answers_attemptId_idx" ON "assessment_answers"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_answers_questionId_idx" ON "assessment_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_attemptId_questionId_key" ON "assessment_answers"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
