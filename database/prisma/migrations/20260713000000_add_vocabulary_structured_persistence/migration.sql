-- Add structured vocabulary persistence foundation
-- VocabularySectionKind enum, VocabularySection + VocabularyRelation tables
-- Extend LessonVocabulary with nullable section/source fields

-- Create enum type
CREATE TYPE "vocabulary_section_kind" AS ENUM ('STANDARD_VOCABULARY', 'SYNONYM_ANTONYM');

-- Create vocabulary_sections table
CREATE TABLE "vocabulary_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonId" UUID NOT NULL,
    "kind" "vocabulary_section_kind" NOT NULL,
    "title" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceTableIndex" INTEGER,
    "sourceTitleRowIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vocabulary_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vocabulary_sections_lessonId_idx" ON "vocabulary_sections"("lessonId");
CREATE INDEX "vocabulary_sections_lessonId_displayOrder_idx" ON "vocabulary_sections"("lessonId", "displayOrder");

ALTER TABLE "vocabulary_sections" ADD CONSTRAINT "vocabulary_sections_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE;

-- Extend lesson_vocabulary with nullable fields
ALTER TABLE "lesson_vocabulary" ADD COLUMN "sectionId" UUID;
ALTER TABLE "lesson_vocabulary" ADD COLUMN "sourceTableIndex" INTEGER;
ALTER TABLE "lesson_vocabulary" ADD COLUMN "sourceRowIndex" INTEGER;
ALTER TABLE "lesson_vocabulary" ADD COLUMN "sourcePairIndex" INTEGER;

CREATE INDEX "lesson_vocabulary_sectionId_idx" ON "lesson_vocabulary"("sectionId");

ALTER TABLE "lesson_vocabulary" ADD CONSTRAINT "lesson_vocabulary_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "vocabulary_sections"("id") ON DELETE SET NULL;

-- Create vocabulary_relations table
CREATE TABLE "vocabulary_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "primaryWord" TEXT NOT NULL,
    "primaryTranslation" TEXT NOT NULL,
    "synonym" TEXT,
    "synonymTranslation" TEXT,
    "antonym" TEXT,
    "antonymTranslation" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceTableIndex" INTEGER,
    "sourceRowIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vocabulary_relations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vocabulary_relations_lessonId_idx" ON "vocabulary_relations"("lessonId");
CREATE INDEX "vocabulary_relations_sectionId_idx" ON "vocabulary_relations"("sectionId");
CREATE INDEX "vocabulary_relations_lessonId_displayOrder_idx" ON "vocabulary_relations"("lessonId", "displayOrder");

ALTER TABLE "vocabulary_relations" ADD CONSTRAINT "vocabulary_relations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE;
ALTER TABLE "vocabulary_relations" ADD CONSTRAINT "vocabulary_relations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "vocabulary_sections"("id") ON DELETE CASCADE;
