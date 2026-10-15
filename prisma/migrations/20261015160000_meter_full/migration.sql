-- AlterTable
ALTER TABLE "MeterSite" ADD COLUMN "meterNumber" TEXT;
ALTER TABLE "MeterSite" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "MeterSite" ADD COLUMN "municipality" TEXT;
ALTER TABLE "MeterSite" ADD COLUMN "location" TEXT;
ALTER TABLE "MeterSite" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'kL';
ALTER TABLE "MeterSite" ADD COLUMN "publicToken" TEXT;

-- Existing rows need a token before the column can be required.
UPDATE "MeterSite" SET "publicToken" = lower(hex(randomblob(16))) WHERE "publicToken" IS NULL;

CREATE UNIQUE INDEX "MeterSite_publicToken_key" ON "MeterSite"("publicToken");

-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN "readerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MeterReading" ADD COLUMN "readerSignature" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "extraPhotoUrl" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "note" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "previousReading" REAL;
ALTER TABLE "MeterReading" ADD COLUMN "usage" REAL;
ALTER TABLE "MeterReading" ADD COLUMN "baseline" REAL;
ALTER TABLE "MeterReading" ADD COLUMN "varianceNote" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "checkedByName" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "checkedSignature" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "checkedAt" DATETIME;
ALTER TABLE "MeterReading" ADD COLUMN "checkNote" TEXT;
ALTER TABLE "MeterReading" ADD COLUMN "checkPhotoUrl" TEXT;

-- CreateIndex
CREATE INDEX "MeterReading_siteId_idx" ON "MeterReading"("siteId");
