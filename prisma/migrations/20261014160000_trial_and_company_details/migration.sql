-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "phoneKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN "companyKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "trialNote" TEXT;
ALTER TABLE "Organization" ADD COLUMN "trialNoticeSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TrialClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrialClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialClaim_kind_value_key" ON "TrialClaim"("kind", "value");
