-- AlterTable
ALTER TABLE "lesson_documents" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
ADD COLUMN "downloadable" BOOLEAN NOT NULL DEFAULT true;
