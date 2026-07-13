-- Add independent Final Review persistence foundation
-- Absorbed FK/DEFAULT/rename operations from 20260711100412_init to fix replay order

CREATE TABLE "final_reviews" (
    "id" UUID NOT NULL,
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
    CONSTRAINT "final_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "final_reviews_gradeId_idx" ON "final_reviews"("gradeId");
CREATE INDEX "final_reviews_academicYearId_idx" ON "final_reviews"("academicYearId");
CREATE INDEX "final_reviews_termId_idx" ON "final_reviews"("termId");
CREATE INDEX "final_reviews_educationalSystem_idx" ON "final_reviews"("educationalSystem");
CREATE INDEX "final_reviews_displayOrder_idx" ON "final_reviews"("displayOrder");
CREATE INDEX "final_reviews_gradeId_academicYearId_termId_educationalSyst_idx" ON "final_reviews"("gradeId", "academicYearId", "termId", "educationalSystem");

ALTER TABLE "final_reviews" ADD CONSTRAINT "final_reviews_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "final_reviews" ADD CONSTRAINT "final_reviews_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "final_reviews" ADD CONSTRAINT "final_reviews_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "final_review_sections" (
    "id" UUID NOT NULL,
    "finalReviewId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "final_review_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "final_review_sections_finalReviewId_idx" ON "final_review_sections"("finalReviewId");
CREATE INDEX "final_review_sections_displayOrder_idx" ON "final_review_sections"("displayOrder");
CREATE INDEX "final_review_sections_finalReviewId_displayOrder_idx" ON "final_review_sections"("finalReviewId", "displayOrder");

ALTER TABLE "final_review_sections" ADD CONSTRAINT "final_review_sections_finalReviewId_fkey" FOREIGN KEY ("finalReviewId") REFERENCES "final_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
