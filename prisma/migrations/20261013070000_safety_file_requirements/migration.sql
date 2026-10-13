-- AlterTable
ALTER TABLE "ContractorProfile" ADD COLUMN "contactName" TEXT;
ALTER TABLE "ContractorProfile" ADD COLUMN "requirementsJson" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ContractorDocument" ADD COLUMN "fileName" TEXT;
ALTER TABLE "ContractorDocument" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "ContractorDocument" ADD COLUMN "sizeBytes" INTEGER;
