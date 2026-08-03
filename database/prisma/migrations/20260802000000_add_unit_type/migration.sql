-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('UNIT', 'STORY', 'FINAL_REVIEW');

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "unitType" "UnitType" NOT NULL DEFAULT 'UNIT';

-- CreateIndex
CREATE INDEX "units_unitType_idx" ON "units"("unitType");
