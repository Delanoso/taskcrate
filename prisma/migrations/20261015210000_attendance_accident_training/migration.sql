-- CreateTable
CREATE TABLE "AttendanceSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "publicToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceSite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendancePunch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "photoUrl" TEXT NOT NULL,
    "signatureUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendancePunch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "AttendanceSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccidentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "occurredAt" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "injuredName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "idNumber" TEXT,
    "jobTitle" TEXT,
    "activity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "injury" TEXT NOT NULL,
    "treatment" TEXT,
    "witnesses" TEXT,
    "actionTaken" TEXT,
    "photoUrl" TEXT,
    "extraPhotoUrl" TEXT,
    "reporterName" TEXT NOT NULL,
    "reporterSignature" TEXT NOT NULL,
    "injuredSignature" TEXT,
    "witnessName" TEXT,
    "witnessSignature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccidentReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "ticketType" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "provider" TEXT,
    "issuedOn" TEXT NOT NULL,
    "expiresOn" TEXT NOT NULL,
    "photoUrl" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSite_publicToken_key" ON "AttendanceSite"("publicToken");
CREATE INDEX "AttendancePunch_siteId_idx" ON "AttendancePunch"("siteId");
CREATE UNIQUE INDEX "AccidentReport_organizationId_reportNumber_key" ON "AccidentReport"("organizationId", "reportNumber");
CREATE INDEX "AccidentReport_organizationId_idx" ON "AccidentReport"("organizationId");
CREATE INDEX "TrainingTicket_organizationId_idx" ON "TrainingTicket"("organizationId");
