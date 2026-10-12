-- AlterTable
ALTER TABLE "WorkPermit" ADD COLUMN "issuerName" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "specificLocation" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "equipmentId" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "startAt" DATETIME;
ALTER TABLE "WorkPermit" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "WorkPermit" ADD COLUMN "hazardsJson" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "lotoConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkPermit" ADD COLUMN "barricadesConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkPermit" ADD COLUMN "fireExtinguisherOk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkPermit" ADD COLUMN "ppeJson" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "preWorkReceiverSigUrl" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "preWorkIssuerSigUrl" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "preWorkReceiverSignedAt" DATETIME;
ALTER TABLE "WorkPermit" ADD COLUMN "preWorkIssuerSignedAt" DATETIME;
ALTER TABLE "WorkPermit" ADD COLUMN "postWorkReceiverSigUrl" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "postWorkIssuerSigUrl" TEXT;
ALTER TABLE "WorkPermit" ADD COLUMN "postWorkReceiverSignedAt" DATETIME;
ALTER TABLE "WorkPermit" ADD COLUMN "postWorkIssuerSignedAt" DATETIME;
