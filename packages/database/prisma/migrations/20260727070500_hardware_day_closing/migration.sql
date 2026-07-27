-- CreateTable
CREATE TABLE "HardwareDayClosing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "openingCashCents" INTEGER NOT NULL DEFAULT 0,
    "expectedCashCents" INTEGER NOT NULL DEFAULT 0,
    "countedCashCents" INTEGER NOT NULL DEFAULT 0,
    "differenceCents" INTEGER NOT NULL DEFAULT 0,
    "totals" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopenedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareDayClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HardwareDayClosing_tenantId_businessDate_key" ON "HardwareDayClosing"("tenantId", "businessDate");

-- CreateIndex
CREATE INDEX "HardwareDayClosing_tenantId_status_idx" ON "HardwareDayClosing"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HardwareDayClosing_closedById_idx" ON "HardwareDayClosing"("closedById");

-- CreateIndex
CREATE INDEX "HardwareDayClosing_reopenedById_idx" ON "HardwareDayClosing"("reopenedById");

-- AddForeignKey
ALTER TABLE "HardwareDayClosing" ADD CONSTRAINT "HardwareDayClosing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDayClosing" ADD CONSTRAINT "HardwareDayClosing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDayClosing" ADD CONSTRAINT "HardwareDayClosing_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
