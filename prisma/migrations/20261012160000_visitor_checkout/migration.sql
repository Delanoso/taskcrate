-- AlterTable
ALTER TABLE "VisitorCheckIn" ADD COLUMN "checkoutToken" TEXT;
ALTER TABLE "VisitorCheckIn" ADD COLUMN "checkedOutAt" DATETIME;
ALTER TABLE "VisitorCheckIn" ADD COLUMN "checkedOutBy" TEXT;

-- CreateIndex
CREATE INDEX "VisitorCheckIn_checkoutToken_idx" ON "VisitorCheckIn"("checkoutToken");

-- CreateIndex
CREATE INDEX "VisitorCheckIn_siteId_checkedOutAt_idx" ON "VisitorCheckIn"("siteId", "checkedOutAt");
