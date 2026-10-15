ALTER TABLE "VisitorCheckIn" ADD COLUMN "company" TEXT;
ALTER TABLE "VisitorCheckIn" ADD COLUMN "hostName" TEXT;
ALTER TABLE "VisitorCheckIn" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "VisitorCheckIn" ADD COLUMN "signatureUrl" TEXT;

ALTER TABLE "LoanDeductibleRecord" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "LoanDeductibleRecord" ADD COLUMN "repaymentNote" TEXT;

ALTER TABLE "FitForDutySite" ADD COLUMN "location" TEXT;
ALTER TABLE "FitForDutyCheck" ADD COLUMN "employeeNumber" TEXT;
ALTER TABLE "FitForDutyCheck" ADD COLUMN "ppeJson" TEXT;
ALTER TABLE "FitForDutyCheck" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "FitForDutyCheck" ADD COLUMN "signatureUrl" TEXT;
ALTER TABLE "FitForDutyCheck" ADD COLUMN "note" TEXT;
CREATE INDEX "FitForDutyCheck_siteId_idx" ON "FitForDutyCheck"("siteId");
