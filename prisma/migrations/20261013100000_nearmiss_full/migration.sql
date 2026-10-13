-- AlterTable
ALTER TABLE "NearMissBoard" ADD COLUMN "locationsJson" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "NearMissReport" ADD COLUMN "reference" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "trackingToken" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "reportType" TEXT NOT NULL DEFAULT 'near_miss';
ALTER TABLE "NearMissReport" ADD COLUMN "category" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "potentialSeverity" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "immediateAction" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "occurredAt" DATETIME;
ALTER TABLE "NearMissReport" ADD COLUMN "photosJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "NearMissReport" ADD COLUMN "reporterName" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "reporterContact" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "riskRating" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "assignedTo" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "correctiveAction" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "NearMissReport" ADD COLUMN "feedback" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "triagedAt" DATETIME;
ALTER TABLE "NearMissReport" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "NearMissReport" ADD COLUMN "closedBy" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "closeOutNote" TEXT;
ALTER TABLE "NearMissReport" ADD COLUMN "closeOutPhotosJson" TEXT NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "NearMissReport_trackingToken_key" ON "NearMissReport"("trackingToken");
CREATE INDEX "NearMissReport_organizationId_createdAt_idx" ON "NearMissReport"("organizationId", "createdAt");
