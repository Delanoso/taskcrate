-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'each';
ALTER TABLE "StockItem" ADD COLUMN "location" TEXT;
ALTER TABLE "StockItem" ADD COLUMN "supplier" TEXT;

ALTER TABLE "StockMovement" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "StockMovement" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockMovement" ADD COLUMN "balanceAfter" INTEGER;
ALTER TABLE "StockMovement" ADD COLUMN "partyName" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "partySignature" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "loggedByName" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "loggedBySignature" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "jobRef" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "reason" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");
