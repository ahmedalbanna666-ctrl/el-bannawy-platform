-- DropForeignKey
ALTER TABLE "final_review_section_question_options" DROP CONSTRAINT "final_review_section_question_options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "final_review_section_questions" DROP CONSTRAINT "final_review_section_questions_finalReviewSectionId_fkey";

-- DropForeignKey
ALTER TABLE "final_review_section_videos" DROP CONSTRAINT "final_review_section_videos_finalReviewSectionId_fkey";

-- DropForeignKey
ALTER TABLE "final_review_section_vocab" DROP CONSTRAINT "final_review_section_vocab_finalReviewSectionId_fkey";

-- DropForeignKey
ALTER TABLE "final_review_sections" DROP CONSTRAINT "final_review_sections_finalReviewId_fkey";

-- DropForeignKey
ALTER TABLE "final_reviews" DROP CONSTRAINT "final_reviews_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "final_reviews" DROP CONSTRAINT "final_reviews_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "final_reviews" DROP CONSTRAINT "final_reviews_termId_fkey";

-- DropForeignKey
ALTER TABLE "live_attendance" DROP CONSTRAINT "live_attendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "live_bookings" DROP CONSTRAINT "live_bookings_studentId_fkey";

-- DropForeignKey
ALTER TABLE "live_subscriptions" DROP CONSTRAINT "live_subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_termId_fkey";

-- DropForeignKey
ALTER TABLE "story_attempts" DROP CONSTRAINT "story_attempts_storyId_fkey";

-- DropForeignKey
ALTER TABLE "story_attempts" DROP CONSTRAINT "story_attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapter_answers" DROP CONSTRAINT "story_chapter_answers_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapter_question_options" DROP CONSTRAINT "story_chapter_question_options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapter_questions" DROP CONSTRAINT "story_chapter_questions_storyChapterId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapter_videos" DROP CONSTRAINT "story_chapter_videos_storyChapterId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapter_vocab" DROP CONSTRAINT "story_chapter_vocab_storyChapterId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapters" DROP CONSTRAINT "story_chapters_storyId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_availability" DROP CONSTRAINT "teacher_availability_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_date_blocks" DROP CONSTRAINT "teacher_date_blocks_teacherId_fkey";

-- AlterTable
ALTER TABLE "homework_answers" ADD COLUMN     "aiDetails" JSONB,
ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "grammarErrors" JSONB,
ADD COLUMN     "grammarScore" INTEGER,
ADD COLUMN     "teacherFeedback" TEXT,
ADD COLUMN     "teacherReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teacherScore" INTEGER;

-- AlterTable
ALTER TABLE "homework_questions" ADD COLUMN     "correctionMode" TEXT NOT NULL DEFAULT 'EXACT_MATCH';

-- AlterTable
ALTER TABLE "lesson_settings" ADD COLUMN     "games" TEXT;

-- AlterTable
ALTER TABLE "live_sessions" DROP COLUMN "groupId";

-- AlterTable
ALTER TABLE "mini_exams" DROP COLUMN "chapterId",
DROP COLUMN "storyId",
ADD COLUMN     "questions" JSONB;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "quiz_answers" ADD COLUMN     "aiDetails" JSONB,
ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "grammarErrors" JSONB,
ADD COLUMN     "grammarScore" INTEGER,
ADD COLUMN     "teacherFeedback" TEXT,
ADD COLUMN     "teacherReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teacherScore" INTEGER;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "correctionMode" TEXT NOT NULL DEFAULT 'EXACT_MATCH';

-- AlterTable
ALTER TABLE "ui_config" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "config" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "unlock_codes" ADD COLUMN     "targetId" UUID,
ADD COLUMN     "targetType" TEXT;

-- DropTable
DROP TABLE "final_review_section_question_options";

-- DropTable
DROP TABLE "final_review_section_questions";

-- DropTable
DROP TABLE "final_review_section_videos";

-- DropTable
DROP TABLE "final_review_section_vocab";

-- DropTable
DROP TABLE "final_review_sections";

-- DropTable
DROP TABLE "final_reviews";

-- DropTable
DROP TABLE "stories";

-- DropTable
DROP TABLE "story_attempts";

-- DropTable
DROP TABLE "story_chapter_answers";

-- DropTable
DROP TABLE "story_chapter_question_options";

-- DropTable
DROP TABLE "story_chapter_questions";

-- DropTable
DROP TABLE "story_chapter_videos";

-- DropTable
DROP TABLE "story_chapter_vocab";

-- DropTable
DROP TABLE "story_chapters";

-- CreateTable
CREATE TABLE "video_question_answers" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "selectedOptionIds" JSONB NOT NULL DEFAULT '[]',
    "text" TEXT,
    "correct" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transfer_numbers" (
    "id" UUID NOT NULL,
    "gateway" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "accountName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transfer_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_payment_orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "gateway" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "senderNumber" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_configs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_configs" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "accountSid" TEXT,
    "authToken" TEXT,
    "phoneNumber" TEXT,
    "apiKey" TEXT,
    "apiUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_question_answers_questionId_idx" ON "video_question_answers"("questionId");

-- CreateIndex
CREATE INDEX "video_question_answers_userId_idx" ON "video_question_answers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "video_question_answers_questionId_userId_key" ON "video_question_answers"("questionId", "userId");

-- CreateIndex
CREATE INDEX "manual_payment_orders_userId_idx" ON "manual_payment_orders"("userId");

-- CreateIndex
CREATE INDEX "manual_payment_orders_status_idx" ON "manual_payment_orders"("status");

-- CreateIndex
CREATE INDEX "manual_payment_orders_createdAt_idx" ON "manual_payment_orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_configs_key_key" ON "notification_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_key" ON "notification_templates"("key");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_createdAt_idx" ON "whatsapp_messages"("createdAt");

-- CreateIndex
CREATE INDEX "lesson_vocabulary_word_idx" ON "lesson_vocabulary"("word");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "payments_productType_productId_idx" ON "payments"("productType", "productId");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_completedAt_idx" ON "payments"("completedAt");

-- CreateIndex
CREATE INDEX "users_academicYearId_idx" ON "users"("academicYearId");

-- CreateIndex
CREATE INDEX "users_termId_idx" ON "users"("termId");

-- CreateIndex
CREATE INDEX "users_gradeId_idx" ON "users"("gradeId");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- AddForeignKey
ALTER TABLE "video_question_answers" ADD CONSTRAINT "video_question_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "video_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_question_answers" ADD CONSTRAINT "video_question_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_bookings" ADD CONSTRAINT "live_bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_subscriptions" ADD CONSTRAINT "live_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_attendance" ADD CONSTRAINT "live_attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_date_blocks" ADD CONSTRAINT "teacher_date_blocks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_orders" ADD CONSTRAINT "manual_payment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_orders" ADD CONSTRAINT "manual_payment_orders_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "coin_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_orders" ADD CONSTRAINT "manual_payment_orders_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
