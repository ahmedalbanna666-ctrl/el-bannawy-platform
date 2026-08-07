-- AddColumn: verificationCode on unit_certificates
ALTER TABLE "unit_certificates"
ADD COLUMN "verificationCode" VARCHAR(32);

-- CreateIndex
CREATE UNIQUE INDEX "unit_certificates_verificationCode_key" ON "unit_certificates"("verificationCode");
