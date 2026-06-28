-- AlterTable: Homework
ALTER TABLE "homework" 
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowRetry" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showAnswers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: HomeworkQuestion
ALTER TABLE "homework_questions" 
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  ADD COLUMN "explanation" TEXT;

-- CreateTable: HomeworkAnswer
CREATE TABLE "homework_answers" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "homework_answers_attemptId_idx" ON "homework_answers"("attemptId");
CREATE INDEX "homework_answers_questionId_idx" ON "homework_answers"("questionId");
CREATE UNIQUE INDEX "homework_answers_attemptId_questionId_key" ON "homework_answers"("attemptId", "questionId");

ALTER TABLE "homework_answers" ADD CONSTRAINT "homework_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_homework_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_answers" ADD CONSTRAINT "homework_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "homework_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
