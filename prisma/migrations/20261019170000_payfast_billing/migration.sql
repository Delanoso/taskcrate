-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "reference" TEXT NOT NULL,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "appsJson" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "recurringAmount" REAL NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payfastToken" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentIntent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DebitOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "appsJson" TEXT NOT NULL,
    "recurringAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastPaidAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebitOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'payfast',
    "providerRef" TEXT NOT NULL,
    "intentId" TEXT,
    "token" TEXT,
    "kind" TEXT NOT NULL,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "appsJson" TEXT NOT NULL,
    "amountGross" REAL NOT NULL,
    "amountFee" REAL,
    "amountNet" REAL,
    "invoiceNumber" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "DebitOrder_token_key" ON "DebitOrder"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_providerRef_key" ON "BillingPayment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_invoiceNumber_key" ON "BillingPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingPayment_organizationId_idx" ON "BillingPayment"("organizationId");
