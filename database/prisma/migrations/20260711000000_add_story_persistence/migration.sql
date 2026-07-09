-- Add independent Story persistence foundation

-- Story
CREATE TABLE "stories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "gradeId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "educationalSystem" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stories_gradeId_idx" ON "stories"("gradeId");
CREATE INDEX "stories_academicYearId_idx" ON "stories"("academicYearId");
CREATE INDEX "stories_termId_idx" ON "stories"("termId");
CREATE INDEX "stories_educationalSystem_idx" ON "stories"("educationalSystem");
CREATE INDEX "stories_displayOrder_idx" ON "stories"("displayOrder");
CREATE INDEX "stories_gradeId_academicYearId_termId_educationalSystem_idx" ON "stories"("gradeId", "academicYearId", "termId", "educationalSystem");

ALTER TABLE "stories" ADD CONSTRAINT "stories_gradeId_fkey"
    FOREIGN KEY ("gradeId") REFERENCES "grades"("id");
ALTER TABLE "stories" ADD CONSTRAINT "stories_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id");
ALTER TABLE "stories" ADD CONSTRAINT "stories_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "terms"("id");

-- StoryChapter
CREATE TABLE "story_chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "story_chapters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "story_chapters_storyId_idx" ON "story_chapters"("storyId");
CREATE INDEX "story_chapters_displayOrder_idx" ON "story_chapters"("displayOrder");
CREATE INDEX "story_chapters_storyId_displayOrder_idx" ON "story_chapters"("storyId", "displayOrder");

ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE;
