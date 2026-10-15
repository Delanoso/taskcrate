-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "make" TEXT;

ALTER TABLE "VehicleTripLog" ADD COLUMN "licenceNo" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "site" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "endDriverName" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "faultNote" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "driverSignature" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "endSignature" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "endNote" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "handoverFromSignature" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "handoverToSignature" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "handoverKm" INTEGER;
ALTER TABLE "VehicleTripLog" ADD COLUMN "handoverNote" TEXT;
ALTER TABLE "VehicleTripLog" ADD COLUMN "handoverAt" DATETIME;
ALTER TABLE "VehicleTripLog" ADD COLUMN "endedAt" DATETIME;

-- CreateIndex
CREATE INDEX "VehicleTripLog_vehicleId_idx" ON "VehicleTripLog"("vehicleId");
