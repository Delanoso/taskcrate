-- AlterTable
ALTER TABLE "OhsaAudit" ADD COLUMN "auditorName" TEXT;
ALTER TABLE "OhsaAudit" ADD COLUMN "documentNumber" TEXT;
ALTER TABLE "OhsaAudit" ADD COLUMN "completedAt" DATETIME;

-- CreateTable
CREATE TABLE "OhsaAuditAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "note" TEXT,
    "photosJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OhsaAuditAnswer_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "OhsaAudit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OhsaAuditAnswer_auditId_questionId_key" ON "OhsaAuditAnswer"("auditId", "questionId");
