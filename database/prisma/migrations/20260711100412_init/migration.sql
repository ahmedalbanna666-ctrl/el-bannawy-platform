-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'BANNED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STAFF';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "books" DROP CONSTRAINT "books_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "books" DROP CONSTRAINT "books_termId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_termId_fkey";

-- DropForeignKey
ALTER TABLE "story_chapters" DROP CONSTRAINT "story_chapters_storyId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_grades" DROP CONSTRAINT "teacher_grades_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_grades" DROP CONSTRAINT "teacher_grades_userId_fkey";

-- DropForeignKey
ALTER TABLE "terms" DROP CONSTRAINT "terms_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "units_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "units_bookId_fkey";

-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "units_termId_fkey";

-- DropForeignKey
ALTER TABLE "user_permission_grants" DROP CONSTRAINT "user_permission_grants_grantedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "user_permission_grants" DROP CONSTRAINT "user_permission_grants_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_managedByTeacherId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_termId_fkey";

-- AlterTable
ALTER TABLE "academic_years" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "entityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "books" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "story_chapters" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "terms" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_permission_grants" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managedByTeacherId_fkey" FOREIGN KEY ("managedByTeacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_grants" ADD CONSTRAINT "user_permission_grants_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


