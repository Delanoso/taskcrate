-- AlterTable
ALTER TABLE "ObSite" ADD COLUMN "location" TEXT;

ALTER TABLE "ObEntry" ADD COLUMN "entryNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ObEntry" ADD COLUMN "people" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "actionTaken" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "guardName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ObEntry" ADD COLUMN "guardSignature" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "extraPhotoUrl" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "handoverToName" TEXT;
ALTER TABLE "ObEntry" ADD COLUMN "handoverToSignature" TEXT;

-- CreateIndex
CREATE INDEX "ObEntry_siteId_idx" ON "ObEntry"("siteId");
