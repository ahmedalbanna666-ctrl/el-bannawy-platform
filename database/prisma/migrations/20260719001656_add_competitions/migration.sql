-- CreateTable
CREATE TABLE "story_chapter_videos" (
    "id" UUID NOT NULL,
    "storyChapterId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "providerVideoId" TEXT NOT NULL,
    "providerUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_chapter_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapter_vocab" (
    "id" UUID NOT NULL,
    "storyChapterId" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "definition" TEXT,
    "example" TEXT,
    "partOfSpeech" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_chapter_vocab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapter_questions" (
    "id" UUID NOT NULL,
    "storyChapterId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_chapter_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapter_question_options" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "story_chapter_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "chapterId" UUID,
    "score" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "story_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapter_answers" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_chapter_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_exams" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "unitId" UUID,
    "storyId" UUID,
    "lessonId" UUID,
    "chapterId" UUID,
    "questionCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "poolSize" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "score" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "mini_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_exam_answers" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_review_section_videos" (
    "id" UUID NOT NULL,
    "finalReviewSectionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "providerVideoId" TEXT NOT NULL,
    "providerUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_review_section_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_review_section_vocab" (
    "id" UUID NOT NULL,
    "finalReviewSectionId" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "definition" TEXT,
    "example" TEXT,
    "partOfSpeech" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "final_review_section_vocab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_review_section_questions" (
    "id" UUID NOT NULL,
    "finalReviewSectionId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_review_section_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_review_section_question_options" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "final_review_section_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'QUIZ',
    "gradeId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'GRADE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timeLimitMinutes" INTEGER,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "coinReward" INTEGER NOT NULL DEFAULT 0,
    "questions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_participants" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invitedBy" UUID,
    "joinedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userRole" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedAgentId" UUID,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_chapter_videos_storyChapterId_idx" ON "story_chapter_videos"("storyChapterId");

-- CreateIndex
CREATE INDEX "story_chapter_videos_displayOrder_idx" ON "story_chapter_videos"("displayOrder");

-- CreateIndex
CREATE INDEX "story_chapter_vocab_storyChapterId_idx" ON "story_chapter_vocab"("storyChapterId");

-- CreateIndex
CREATE INDEX "story_chapter_questions_storyChapterId_idx" ON "story_chapter_questions"("storyChapterId");

-- CreateIndex
CREATE INDEX "story_chapter_questions_displayOrder_idx" ON "story_chapter_questions"("displayOrder");

-- CreateIndex
CREATE INDEX "story_chapter_question_options_questionId_idx" ON "story_chapter_question_options"("questionId");

-- CreateIndex
CREATE INDEX "story_attempts_userId_idx" ON "story_attempts"("userId");

-- CreateIndex
CREATE INDEX "story_attempts_storyId_idx" ON "story_attempts"("storyId");

-- CreateIndex
CREATE INDEX "story_chapter_answers_attemptId_idx" ON "story_chapter_answers"("attemptId");

-- CreateIndex
CREATE INDEX "story_chapter_answers_questionId_idx" ON "story_chapter_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "story_chapter_answers_attemptId_questionId_key" ON "story_chapter_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "mini_exams_userId_idx" ON "mini_exams"("userId");

-- CreateIndex
CREATE INDEX "mini_exam_answers_examId_idx" ON "mini_exam_answers"("examId");

-- CreateIndex
CREATE INDEX "mini_exam_answers_questionId_idx" ON "mini_exam_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "mini_exam_answers_examId_questionId_key" ON "mini_exam_answers"("examId", "questionId");

-- CreateIndex
CREATE INDEX "final_review_section_videos_finalReviewSectionId_idx" ON "final_review_section_videos"("finalReviewSectionId");

-- CreateIndex
CREATE INDEX "final_review_section_videos_displayOrder_idx" ON "final_review_section_videos"("displayOrder");

-- CreateIndex
CREATE INDEX "final_review_section_vocab_finalReviewSectionId_idx" ON "final_review_section_vocab"("finalReviewSectionId");

-- CreateIndex
CREATE INDEX "final_review_section_questions_finalReviewSectionId_idx" ON "final_review_section_questions"("finalReviewSectionId");

-- CreateIndex
CREATE INDEX "final_review_section_questions_displayOrder_idx" ON "final_review_section_questions"("displayOrder");

-- CreateIndex
CREATE INDEX "final_review_section_question_options_questionId_idx" ON "final_review_section_question_options"("questionId");

-- CreateIndex
CREATE INDEX "competitions_gradeId_idx" ON "competitions"("gradeId");

-- CreateIndex
CREATE INDEX "competitions_createdById_idx" ON "competitions"("createdById");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE INDEX "competition_participants_competitionId_idx" ON "competition_participants"("competitionId");

-- CreateIndex
CREATE INDEX "competition_participants_studentId_idx" ON "competition_participants"("studentId");

-- CreateIndex
CREATE INDEX "competition_participants_status_idx" ON "competition_participants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "competition_participants_competitionId_studentId_key" ON "competition_participants"("competitionId", "studentId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_assignedAgentId_idx" ON "support_tickets"("assignedAgentId");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_idx" ON "support_messages"("ticketId");

-- AddForeignKey
ALTER TABLE "story_chapter_videos" ADD CONSTRAINT "story_chapter_videos_storyChapterId_fkey" FOREIGN KEY ("storyChapterId") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapter_vocab" ADD CONSTRAINT "story_chapter_vocab_storyChapterId_fkey" FOREIGN KEY ("storyChapterId") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapter_questions" ADD CONSTRAINT "story_chapter_questions_storyChapterId_fkey" FOREIGN KEY ("storyChapterId") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapter_question_options" ADD CONSTRAINT "story_chapter_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "story_chapter_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_attempts" ADD CONSTRAINT "story_attempts_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_attempts" ADD CONSTRAINT "story_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapter_answers" ADD CONSTRAINT "story_chapter_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "story_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_exams" ADD CONSTRAINT "mini_exams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_exam_answers" ADD CONSTRAINT "mini_exam_answers_examId_fkey" FOREIGN KEY ("examId") REFERENCES "mini_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_review_section_videos" ADD CONSTRAINT "final_review_section_videos_finalReviewSectionId_fkey" FOREIGN KEY ("finalReviewSectionId") REFERENCES "final_review_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_review_section_vocab" ADD CONSTRAINT "final_review_section_vocab_finalReviewSectionId_fkey" FOREIGN KEY ("finalReviewSectionId") REFERENCES "final_review_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_review_section_questions" ADD CONSTRAINT "final_review_section_questions_finalReviewSectionId_fkey" FOREIGN KEY ("finalReviewSectionId") REFERENCES "final_review_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_review_section_question_options" ADD CONSTRAINT "final_review_section_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "final_review_section_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
