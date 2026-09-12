-- CreateTable
CREATE TABLE "unlock_pricings" (
    "id" UUID NOT NULL,
    "stageId" UUID,
    "gradeId" UUID,
    "targetType" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unlock_pricings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unlock_pricings_stageId_idx" ON "unlock_pricings"("stageId");

-- CreateIndex
CREATE INDEX "unlock_pricings_gradeId_idx" ON "unlock_pricings"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "unlock_pricings_stageId_gradeId_targetType_key" ON "unlock_pricings"("stageId", "gradeId", "targetType");

-- AddForeignKey
ALTER TABLE "unlock_pricings" ADD CONSTRAINT "unlock_pricings_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlock_pricings" ADD CONSTRAINT "unlock_pricings_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;