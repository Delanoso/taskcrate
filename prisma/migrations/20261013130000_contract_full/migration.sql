-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'contract',
    "kind" TEXT NOT NULL DEFAULT 'text',
    "bodyText" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "pageCount" INTEGER,
    "requireCountersign" BOOLEAN NOT NULL DEFAULT false,
    "dueDays" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ContractTemplate_organizationId_idx" ON "ContractTemplate"("organizationId");

-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN "templateId" TEXT REFERENCES "ContractTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD COLUMN "reference" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "ContractDocument" ADD COLUMN "sourceFileUrl" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "pageCount" INTEGER;
ALTER TABLE "ContractDocument" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "employeePhone" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "employeeEmail" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "batchId" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "requireCountersign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContractDocument" ADD COLUMN "sentBy" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "viewedAt" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "viewIp" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signerName" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signerIdNumber" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signatureUrl" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signIp" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signUserAgent" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "declinedAt" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "declineReason" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "voidedAt" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "countersignedAt" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "countersignName" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "countersignUrl" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "signedPdfUrl" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN "lastRemindedAt" DATETIME;
ALTER TABLE "ContractDocument" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "ContractDocument_organizationId_idx" ON "ContractDocument"("organizationId");
