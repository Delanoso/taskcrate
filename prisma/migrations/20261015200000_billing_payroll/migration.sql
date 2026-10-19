-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "registrationNumber" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "vatNumber" TEXT,
    "vatPercent" REAL NOT NULL DEFAULT 15,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "branchCode" TEXT,
    "accountType" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'ZAR',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "quoteValidDays" INTEGER NOT NULL DEFAULT 14,
    "terms" TEXT,
    "footerNote" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "linesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "templateName" TEXT,
    "currency" TEXT NOT NULL,
    "chargeVat" BOOLEAN NOT NULL DEFAULT false,
    "vatPercent" REAL NOT NULL DEFAULT 0,
    "clientName" TEXT NOT NULL,
    "clientCompany" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "clientVatNumber" TEXT,
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "theirReference" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "linesJson" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidOn" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "sourceQuoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "payeNumber" TEXT,
    "uifNumber" TEXT,
    "sdlNumber" TEXT,
    "paySdl" BOOLEAN NOT NULL DEFAULT false,
    "payDay" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollEmployee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "idNumber" TEXT,
    "taxNumber" TEXT,
    "dateOfBirth" TEXT,
    "startDate" TEXT,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "branchCode" TEXT,
    "accountType" TEXT,
    "monthlySalaryCents" INTEGER NOT NULL DEFAULT 0,
    "allowanceCents" INTEGER NOT NULL DEFAULT 0,
    "pensionCents" INTEGER NOT NULL DEFAULT 0,
    "employerPensionCents" INTEGER NOT NULL DEFAULT 0,
    "medicalMember" BOOLEAN NOT NULL DEFAULT false,
    "medicalDependants" INTEGER NOT NULL DEFAULT 0,
    "medicalDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "paysUif" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "finalisedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollLine" (
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
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "employerCostCents" INTEGER NOT NULL DEFAULT 0,
    "ageAtYearEnd" INTEGER,
    "rebateLabel" TEXT,
    "note" TEXT,
    CONSTRAINT "PayrollLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_organizationId_key" ON "BillingProfile"("organizationId");
CREATE UNIQUE INDEX "BillingTemplate_organizationId_name_key" ON "BillingTemplate"("organizationId", "name");
CREATE UNIQUE INDEX "BillingDocument_organizationId_number_key" ON "BillingDocument"("organizationId", "number");
CREATE INDEX "BillingDocument_organizationId_idx" ON "BillingDocument"("organizationId");
CREATE UNIQUE INDEX "PayrollProfile_organizationId_key" ON "PayrollProfile"("organizationId");
CREATE INDEX "PayrollEmployee_organizationId_idx" ON "PayrollEmployee"("organizationId");
CREATE UNIQUE INDEX "PayrollRun_organizationId_period_key" ON "PayrollRun"("organizationId", "period");
CREATE INDEX "PayrollLine_runId_idx" ON "PayrollLine"("runId");
