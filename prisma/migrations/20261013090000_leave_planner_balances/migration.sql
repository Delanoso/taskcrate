-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeLevel" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT,
    "leaveType" TEXT NOT NULL DEFAULT 'annual',
    "days" REAL,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "cancelledAt" DATETIME,
    "capturedBy" TEXT,
    CONSTRAINT "LeaveRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "LeaveEmployee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeaveRequest" ("id", "organizationId", "publicToken", "employeeName", "employeeLevel", "startDate", "endDate", "reason", "status", "createdAt")
SELECT "id", "organizationId", "publicToken", "employeeName", "employeeLevel", "startDate", "endDate", "reason", "status", "createdAt" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
CREATE UNIQUE INDEX "LeaveRequest_publicToken_key" ON "LeaveRequest"("publicToken");
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "LeaveEmployee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "phone" TEXT,
    "level" TEXT NOT NULL DEFAULT 'Staff',
    "startDate" DATETIME NOT NULL,
    "annualDays" REAL NOT NULL DEFAULT 15,
    "balanceDate" DATETIME NOT NULL,
    "openingAnnual" REAL NOT NULL DEFAULT 0,
    "openingSick" REAL,
    "openingFamily" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeaveEmployee_organizationId_idx" ON "LeaveEmployee"("organizationId");
CREATE INDEX "LeaveEmployee_publicToken_idx" ON "LeaveEmployee"("publicToken");

-- CreateTable
CREATE TABLE "LeaveAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "days" REAL NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "LeaveEmployee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeaveAdjustment_employeeId_idx" ON "LeaveAdjustment"("employeeId");

-- CreateTable
CREATE TABLE "LeaveSettings" (
    "organizationId" TEXT NOT NULL PRIMARY KEY,
    "workDays" TEXT NOT NULL DEFAULT '12345',
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LeaveSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
