-- Create tables for academic content isolation

-- AcademicYear
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academic_years_name_key" UNIQUE ("name"),
    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- Term
CREATE TABLE "terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "academicYearId" UUID NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "terms_academicYearId_idx" ON "terms"("academicYearId");
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE;

-- Book
CREATE TABLE "books" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "gradeId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "books_gradeId_idx" ON "books"("gradeId");
CREATE INDEX "books_termId_idx" ON "books"("termId");
ALTER TABLE "books" ADD CONSTRAINT "books_gradeId_fkey"
    FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE;

-- TeacherGrade (join table)
CREATE TABLE "teacher_grades" (
    "userId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_grades_pkey" PRIMARY KEY ("userId", "gradeId")
);
CREATE INDEX "teacher_grades_gradeId_idx" ON "teacher_grades"("gradeId");
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "teacher_grades" ADD CONSTRAINT "teacher_grades_gradeId_fkey"
    FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE;

-- Add academic context columns to units
ALTER TABLE "units" ADD COLUMN "academicYearId" UUID;
ALTER TABLE "units" ADD COLUMN "termId" UUID;
ALTER TABLE "units" ADD COLUMN "educationalSystem" TEXT;
ALTER TABLE "units" ADD COLUMN "bookId" UUID;
CREATE INDEX "units_academicYearId_idx" ON "units"("academicYearId");
CREATE INDEX "units_termId_idx" ON "units"("termId");
CREATE INDEX "units_educationalSystem_idx" ON "units"("educationalSystem");
CREATE INDEX "units_bookId_idx" ON "units"("bookId");
ALTER TABLE "units" ADD CONSTRAINT "units_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id");
ALTER TABLE "units" ADD CONSTRAINT "units_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "terms"("id");
ALTER TABLE "units" ADD CONSTRAINT "units_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE SET NULL;

-- Add academic context columns to users
ALTER TABLE "users" ADD COLUMN "academicYearId" UUID;
ALTER TABLE "users" ADD COLUMN "termId" UUID;
ALTER TABLE "users" ADD COLUMN "gradeId" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id");
ALTER TABLE "users" ADD CONSTRAINT "users_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "terms"("id");
ALTER TABLE "users" ADD CONSTRAINT "users_gradeId_fkey"
    FOREIGN KEY ("gradeId") REFERENCES "grades"("id");

-- SystemSetting
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_key_key" UNIQUE ("key"),
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- AuditLog
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id");
