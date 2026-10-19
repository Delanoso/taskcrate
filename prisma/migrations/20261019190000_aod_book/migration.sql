-- CreateTable
CREATE TABLE "AodPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paidOn" DATETIME NOT NULL,
    "method" TEXT NOT NULL,
    "payrollPeriod" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AodPayment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "LoanDeductibleRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AodReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'loan',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AodReason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoanDeductibleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "reference" TEXT,
    "employeeName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "employeePhone" TEXT,
    "employeeIdNumber" TEXT,
    "recordType" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'other',
    "reasonLabel" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" DATETIME,
    "repaymentNote" TEXT,
    "instalmentAmount" REAL,
    "firstPeriod" TEXT,
    "repayMethod" TEXT NOT NULL DEFAULT 'payroll',
    "photoUrl" TEXT,
    "photosJson" TEXT,
    "sourceRef" TEXT,
    "issuedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signatureData" TEXT,
    "signerName" TEXT,
    "signIp" TEXT,
    "signedAt" DATETIME,
    "employerSignerName" TEXT,
    "employerSignature" TEXT,
    "declinedAt" DATETIME,
    "declineReason" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "settledAt" DATETIME,
    "lastRemindedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanDeductibleRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LoanDeductibleRecord" ("amount", "createdAt", "description", "employeeName", "employeeNumber", "id", "organizationId", "photoUrl", "publicToken", "recordType", "repaymentNote", "signatureData", "signedAt", "status") SELECT "amount", "createdAt", "description", "employeeName", "employeeNumber", "id", "organizationId", "photoUrl", "publicToken", "recordType", "repaymentNote", "signatureData", "signedAt", "status" FROM "LoanDeductibleRecord";
DROP TABLE "LoanDeductibleRecord";
ALTER TABLE "new_LoanDeductibleRecord" RENAME TO "LoanDeductibleRecord";
CREATE UNIQUE INDEX "LoanDeductibleRecord_publicToken_key" ON "LoanDeductibleRecord"("publicToken");
CREATE INDEX "LoanDeductibleRecord_organizationId_idx" ON "LoanDeductibleRecord"("organizationId");
CREATE TABLE "new_PayrollLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT,
    "fullName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "idNumber" TEXT,
    "taxNumber" TEXT,
    "jobTitle" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "branchCode" TEXT,
    "basicCents" INTEGER NOT NULL DEFAULT 0,
    "allowanceCents" INTEGER NOT NULL DEFAULT 0,
    "onceOffCents" INTEGER NOT NULL DEFAULT 0,
    "pensionCents" INTEGER NOT NULL DEFAULT 0,
    "employerPensionCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "taxableMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "payeCents" INTEGER NOT NULL DEFAULT 0,
    "uifEmployeeCents" INTEGER NOT NULL DEFAULT 0,
    "uifEmployerCents" INTEGER NOT NULL DEFAULT 0,
    "sdlCents" INTEGER NOT NULL DEFAULT 0,
    "medicalCreditCents" INTEGER NOT NULL DEFAULT 0,
    "medicalDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "otherDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "otherDeductionNote" TEXT,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "employerCostCents" INTEGER NOT NULL DEFAULT 0,
    "ageAtYearEnd" INTEGER,
    "rebateLabel" TEXT,
    "note" TEXT,
    CONSTRAINT "PayrollLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PayrollLine" ("accountNumber", "ageAtYearEnd", "allowanceCents", "bankName", "basicCents", "branchCode", "employeeId", "employeeNumber", "employerCostCents", "employerPensionCents", "fullName", "grossCents", "id", "idNumber", "jobTitle", "medicalCreditCents", "medicalDeductionCents", "netCents", "note", "onceOffCents", "payeCents", "pensionCents", "rebateLabel", "runId", "sdlCents", "taxNumber", "taxableMonthlyCents", "uifEmployeeCents", "uifEmployerCents") SELECT "accountNumber", "ageAtYearEnd", "allowanceCents", "bankName", "basicCents", "branchCode", "employeeId", "employeeNumber", "employerCostCents", "employerPensionCents", "fullName", "grossCents", "id", "idNumber", "jobTitle", "medicalCreditCents", "medicalDeductionCents", "netCents", "note", "onceOffCents", "payeCents", "pensionCents", "rebateLabel", "runId", "sdlCents", "taxNumber", "taxableMonthlyCents", "uifEmployeeCents", "uifEmployerCents" FROM "PayrollLine";
DROP TABLE "PayrollLine";
ALTER TABLE "new_PayrollLine" RENAME TO "PayrollLine";
CREATE INDEX "PayrollLine_runId_idx" ON "PayrollLine"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AodPayment_recordId_idx" ON "AodPayment"("recordId");

-- CreateIndex
CREATE INDEX "AodReason_organizationId_idx" ON "AodReason"("organizationId");
