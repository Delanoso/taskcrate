-- AlterTable
ALTER TABLE "DisciplineEntry" ADD COLUMN "reference" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "employeePhone" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "department" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'finalised';
ALTER TABLE "DisciplineEntry" ADD COLUMN "offenceKey" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "offence" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "offenceSeverity" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "location" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "witnesses" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "photosJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "DisciplineEntry" ADD COLUMN "hearingAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "hearingVenue" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "chairperson" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "noticeIssuedAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "noticeAckAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "noticeAckSignature" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "finding" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "outcomeReasons" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "mitigating" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "aggravating" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "sanctionDate" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "validUntil" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "issuedBy" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "issuerSignature" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "signToken" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "employeeSignature" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "employeeSignedAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "employeeComment" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "refusedToSign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DisciplineEntry" ADD COLUMN "witnessName" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "witnessSignature" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "appealLodgedAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "appealGrounds" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "appealOutcome" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "appealNotes" TEXT;
ALTER TABLE "DisciplineEntry" ADD COLUMN "appealDecidedAt" DATETIME;
ALTER TABLE "DisciplineEntry" ADD COLUMN "withdrawnReason" TEXT;

-- CreateTable
CREATE TABLE "DisciplineSettings" (
    "organizationId" TEXT NOT NULL PRIMARY KEY,
    "verbalMonths" INTEGER NOT NULL DEFAULT 3,
    "writtenMonths" INTEGER NOT NULL DEFAULT 6,
    "finalMonths" INTEGER NOT NULL DEFAULT 12,
    "defaultIssuer" TEXT,
    CONSTRAINT "DisciplineSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DisciplineEntry_signToken_key" ON "DisciplineEntry"("signToken");
CREATE INDEX "DisciplineEntry_organizationId_incidentAt_idx" ON "DisciplineEntry"("organizationId", "incidentAt");
