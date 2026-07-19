-- DropForeignKey
ALTER TABLE "assessment_questions" DROP CONSTRAINT "assessment_questions_questionId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_vocabulary" DROP CONSTRAINT "lesson_vocabulary_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary_relations" DROP CONSTRAINT "vocabulary_relations_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary_relations" DROP CONSTRAINT "vocabulary_relations_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary_sections" DROP CONSTRAINT "vocabulary_sections_lessonId_fkey";

-- DropIndex
DROP INDEX "live_sessions_availabilitySlotId_idx";

-- DropIndex
DROP INDEX "teacher_live_settings_teacherId_idx";

-- AlterTable
ALTER TABLE "lesson_videos" ALTER COLUMN "providerVideoId" DROP DEFAULT,
ALTER COLUMN "providerUrl" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "published" SET DEFAULT false;

-- AlterTable
ALTER TABLE "question_attachments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_groups" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_hints" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_options" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_tag_assignments" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_tags" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "units" ALTER COLUMN "published" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "vocabulary_relations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vocabulary_sections" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "video_events" (
    "id" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_questions" (
    "id" UUID NOT NULL,
    "videoEventId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_question_options" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "video_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_events_videoId_idx" ON "video_events"("videoId");

-- CreateIndex
CREATE INDEX "video_events_videoId_timestamp_idx" ON "video_events"("videoId", "timestamp");

-- CreateIndex
CREATE INDEX "video_events_videoId_enabled_idx" ON "video_events"("videoId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "video_questions_videoEventId_key" ON "video_questions"("videoEventId");

-- CreateIndex
CREATE INDEX "video_question_options_questionId_idx" ON "video_question_options"("questionId");

-- AddForeignKey
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "lesson_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_questions" ADD CONSTRAINT "video_questions_videoEventId_fkey" FOREIGN KEY ("videoEventId") REFERENCES "video_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_question_options" ADD CONSTRAINT "video_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "video_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_vocabulary" ADD CONSTRAINT "lesson_vocabulary_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "vocabulary_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_sections" ADD CONSTRAINT "vocabulary_sections_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_relations" ADD CONSTRAINT "vocabulary_relations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_relations" ADD CONSTRAINT "vocabulary_relations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "vocabulary_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
