-- AlterTable
ALTER TABLE "OnboardingPacket" ADD COLUMN "employeeEmail" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "department" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "OnboardingPacket" ADD COLUMN "requirementsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "OnboardingPacket" ADD COLUMN "personalJson" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "bankViewLog" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "OnboardingPacket" ADD COLUMN "consentName" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "consentSignature" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "consentAt" DATETIME;
ALTER TABLE "OnboardingPacket" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "OnboardingPacket" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "OnboardingPacket" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "OnboardingPacket" ADD COLUMN "leaveEmployeeId" TEXT;

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packetId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingDocument_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "OnboardingPacket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OnboardingDocument_packetId_idx" ON "OnboardingDocument"("packetId");
