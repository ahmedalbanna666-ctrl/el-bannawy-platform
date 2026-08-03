-- CreateTable: UnitCertificate
CREATE TABLE "unit_certificates" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_certificates_userId_unitId_key" ON "unit_certificates"("userId", "unitId");

-- CreateIndex
CREATE INDEX "unit_certificates_userId_idx" ON "unit_certificates"("userId");

-- AddForeignKey
ALTER TABLE "unit_certificates"
ADD CONSTRAINT "unit_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_certificates"
ADD CONSTRAINT "unit_certificates_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
