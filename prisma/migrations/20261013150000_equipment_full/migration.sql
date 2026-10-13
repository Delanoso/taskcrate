-- AlterTable
ALTER TABLE "EquipmentCustodyLog" ADD COLUMN "by" TEXT;
ALTER TABLE "EquipmentCustodyLog" ADD COLUMN "issueId" TEXT;

-- CreateTable
CREATE TABLE "EquipmentIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "employeePhone" TEXT,
    "dueBackAt" DATETIME,
    "conditionOut" TEXT NOT NULL,
    "accessories" TEXT,
    "notesOut" TEXT,
    "issuedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'awaiting_signature',
    "signMethod" TEXT NOT NULL DEFAULT 'in_person',
    "signerName" TEXT,
    "signatureUrl" TEXT,
    "signedAt" DATETIME,
    "signIp" TEXT,
    "lastRemindedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "returnBatchId" TEXT,
    "handbackNumber" TEXT,
    "returnedAt" DATETIME,
    "receivedBy" TEXT,
    "conditionIn" TEXT,
    "checklistJson" TEXT,
    "damageNotes" TEXT,
    "photosJson" TEXT,
    "repairCost" REAL,
    "outcome" TEXT,
    "employeePresent" BOOLEAN NOT NULL DEFAULT true,
    "returnSignerName" TEXT,
    "returnSignatureUrl" TEXT,
    "inspectorSignature" TEXT,
    "deductibleId" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquipmentIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EquipmentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EquipmentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetTag" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "serialNumber" TEXT,
    "value" REAL,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "status" TEXT NOT NULL DEFAULT 'available',
    "location" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EquipmentItem" ("assetTag", "createdAt", "id", "name", "organizationId", "status") SELECT "assetTag", "createdAt", "id", "name", "organizationId", "status" FROM "EquipmentItem";
DROP TABLE "EquipmentItem";
ALTER TABLE "new_EquipmentItem" RENAME TO "EquipmentItem";
CREATE INDEX "EquipmentItem_organizationId_idx" ON "EquipmentItem"("organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentIssue_publicToken_key" ON "EquipmentIssue"("publicToken");

-- CreateIndex
CREATE INDEX "EquipmentIssue_organizationId_idx" ON "EquipmentIssue"("organizationId");

-- CreateIndex
CREATE INDEX "EquipmentIssue_itemId_idx" ON "EquipmentIssue"("itemId");

-- CreateIndex
CREATE INDEX "EquipmentIssue_batchId_idx" ON "EquipmentIssue"("batchId");

-- CreateIndex
CREATE INDEX "EquipmentCustodyLog_itemId_idx" ON "EquipmentCustodyLog"("itemId");
