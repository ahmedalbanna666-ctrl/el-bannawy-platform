-- CreateTable: grade_schedules
CREATE TABLE "grade_schedules" (
    "id" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "days" INTEGER[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_schedules_gradeId_key" ON "grade_schedules"("gradeId");

-- AddForeignKey
ALTER TABLE "grade_schedules" ADD CONSTRAINT "grade_schedules_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
