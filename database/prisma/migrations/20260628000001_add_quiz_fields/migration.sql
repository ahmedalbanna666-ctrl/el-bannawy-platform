-- AlterTable: Quiz
ALTER TABLE "quizzes" 
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowRetry" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showAnswers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: QuizQuestion
ALTER TABLE "quiz_questions" 
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  ADD COLUMN "explanation" TEXT;

-- AlterTable: QuizAnswer unique constraint
CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");
