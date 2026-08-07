-- Quiz random-per-attempt settings
-- 1) Quiz.questionCount (how many questions shown per attempt; null = all)
-- 2) Quiz.durationMinutes (teacher-set time limit per attempt; null = no limit)
-- 3) QuizAttempt.questionIds (ordered selected question subset for the attempt)

ALTER TABLE "quizzes" ADD COLUMN     "questionCount" INTEGER,
ADD COLUMN     "durationMinutes" INTEGER;

ALTER TABLE "quiz_attempts" ADD COLUMN     "questionIds" JSONB;
