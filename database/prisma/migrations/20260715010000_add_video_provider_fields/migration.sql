-- AlterTable: Add provider-neutral fields to lesson_videos
ALTER TABLE "lesson_videos"
    ADD COLUMN     "providerName" TEXT NOT NULL DEFAULT 'YOUTUBE',
    ADD COLUMN     "providerVideoId" TEXT NOT NULL DEFAULT '',
    ADD COLUMN     "providerUrl" TEXT NOT NULL DEFAULT '';

-- Backfill provider fields from existing YouTube data
UPDATE "lesson_videos"
SET
    "providerVideoId" = "youtubeId",
    "providerUrl" = "youtubeUrl"
WHERE
    "youtubeId" IS NOT NULL
    AND "youtubeId" != ''
    AND "providerVideoId" = ''
    AND "providerUrl" = '';
