-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "autoRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "courseId" UUID,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lessonId" UUID,
ADD COLUMN     "waitingRoom" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "zoomJoinUrl" TEXT,
ADD COLUMN     "zoomMeetingId" TEXT,
ADD COLUMN     "zoomPassword" TEXT;

-- AlterTable
ALTER TABLE "live_attendance" ADD COLUMN     "device" TEXT,
ADD COLUMN     "ip" TEXT;

-- CreateIndex
CREATE INDEX "live_sessions_lessonId_idx" ON "live_sessions"("lessonId");

-- CreateIndex
CREATE INDEX "live_sessions_courseId_idx" ON "live_sessions"("courseId");

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
