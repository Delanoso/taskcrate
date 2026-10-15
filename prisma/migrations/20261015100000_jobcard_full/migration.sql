-- AlterTable
ALTER TABLE "JobCard" ADD COLUMN "jobNumber" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "location" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "JobCard" ADD COLUMN "reportedByName" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "reportedByPhone" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "openComment" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "openSignature" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "openSignedAt" DATETIME;
ALTER TABLE "JobCard" ADD COLUMN "photosJson" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "workComment" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "technicianSignature" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "technicianSignedAt" DATETIME;
ALTER TABLE "JobCard" ADD COLUMN "acceptComment" TEXT;
ALTER TABLE "JobCard" ADD COLUMN "acceptedAt" DATETIME;
ALTER TABLE "JobCard" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "JobCard" ADD COLUMN "completedAt" DATETIME;
