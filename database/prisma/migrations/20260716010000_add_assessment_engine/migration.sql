-- CreateEnum
CREATE TYPE "assessment_type" AS ENUM ('HOMEWORK', 'LESSON_QUIZ', 'LESSON_FINAL', 'UNIT_QUIZ', 'UNIT_FINAL', 'PRACTICE', 'VIDEO_SURPRISE', 'PLACEMENT_TEST', 'CUSTOM');

-- CreateEnum
CREATE TYPE "assessment_visibility" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "attempt_policy" AS ENUM ('SINGLE', 'MULTIPLE', 'UNLIMITED', 'TEACHER_CONTROLLED');

-- CreateEnum
CREATE TYPE "feedback_policy" AS ENUM ('IMMEDIATE', 'AFTER_SUBMISSION', 'AFTER_DUE_DATE', 'MANUAL_RELEASE', 'NEVER');

-- CreateEnum
CREATE TYPE "scoring_type" AS ENUM ('AUTOMATIC', 'MANUAL', 'MIXED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "lessonId" UUID,
    "unitId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "type" "assessment_type" NOT NULL,
    "visibility" "assessment_visibility" NOT NULL DEFAULT 'DRAFT',
    "passingScore" INTEGER,
    "maxScore" INTEGER,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "randomQuestionCount" INTEGER,
    "timeLimit" INTEGER,
    "unlimitedTime" BOOLEAN NOT NULL DEFAULT true,
    "attemptsAllowed" INTEGER,
    "unlimitedAttempts" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "availableImmediately" BOOLEAN NOT NULL DEFAULT false,
    "manualPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireCompletion" BOOLEAN NOT NULL DEFAULT false,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "attemptPolicy" "attempt_policy" NOT NULL DEFAULT 'SINGLE',
    "feedbackPolicy" "feedback_policy" NOT NULL DEFAULT 'IMMEDIATE',
    "scoringType" "scoring_type" NOT NULL DEFAULT 'AUTOMATIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sections" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT,

    CONSTRAINT "assessment_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "sectionId" UUID,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_lessonId_idx" ON "assessments"("lessonId");

-- CreateIndex
CREATE INDEX "assessments_unitId_idx" ON "assessments"("unitId");

-- CreateIndex
CREATE INDEX "assessments_type_idx" ON "assessments"("type");

-- CreateIndex
CREATE INDEX "assessments_visibility_idx" ON "assessments"("visibility");

-- CreateIndex
CREATE INDEX "assessment_sections_assessmentId_idx" ON "assessment_sections"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessmentId_questionId_key" ON "assessment_questions"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "assessment_questions_assessmentId_idx" ON "assessment_questions"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_questions_questionId_idx" ON "assessment_questions"("questionId");

-- CreateIndex
CREATE INDEX "assessment_questions_sectionId_idx" ON "assessment_questions"("sectionId");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "assessment_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
