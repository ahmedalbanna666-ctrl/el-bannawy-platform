-- CreateEnum
-- (no new enums)

-- CreateTable: question_groups
CREATE TABLE "question_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'GENERAL',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "question_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: questions
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonId" UUID NOT NULL,
    "groupId" UUID,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "instruction" TEXT,
    "explanation" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: question_options
CREATE TABLE "question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable: question_hints
CREATE TABLE "question_hints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable: question_attachments
CREATE TABLE "question_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: question_tags
CREATE TABLE "question_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: question_tag_assignments
CREATE TABLE "question_tag_assignments" (
    "questionId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_tag_assignments_pkey" PRIMARY KEY ("questionId","tagId")
);

-- CreateIndex
CREATE INDEX "question_groups_lessonId_idx" ON "question_groups"("lessonId");
CREATE INDEX "question_groups_lessonId_displayOrder_idx" ON "question_groups"("lessonId", "displayOrder");

-- CreateIndex
CREATE INDEX "questions_lessonId_idx" ON "questions"("lessonId");
CREATE INDEX "questions_lessonId_displayOrder_idx" ON "questions"("lessonId", "displayOrder");
CREATE INDEX "questions_groupId_idx" ON "questions"("groupId");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");
CREATE INDEX "question_options_questionId_displayOrder_idx" ON "question_options"("questionId", "displayOrder");

-- CreateIndex
CREATE INDEX "question_hints_questionId_idx" ON "question_hints"("questionId");

-- CreateIndex
CREATE INDEX "question_attachments_questionId_idx" ON "question_attachments"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_tags_name_key" ON "question_tags"("name");

-- CreateIndex
CREATE INDEX "question_tag_assignments_tagId_idx" ON "question_tag_assignments"("tagId");

-- AddForeignKey
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_hints" ADD CONSTRAINT "question_hints_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tag_assignments" ADD CONSTRAINT "question_tag_assignments_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_tag_assignments" ADD CONSTRAINT "question_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "question_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
