CREATE TABLE "HardwareBusinessSettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "firmName" TEXT NOT NULL,
  "gstin" TEXT,
  "address" JSONB NOT NULL DEFAULT '{}',
  "phone" TEXT,
  "email" TEXT,
  "logoPlaceholder" TEXT,
  "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  "financialYear" TEXT NOT NULL,
  "defaultGstMode" TEXT NOT NULL DEFAULT 'exclusive',
  "roundOffEnabled" BOOLEAN NOT NULL DEFAULT true,
  "defaultStockLocationId" TEXT,
  "termsFooter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareBusinessSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HardwareBusinessSettings_tenantId_key" ON "HardwareBusinessSettings"("tenantId");
CREATE INDEX "HardwareBusinessSettings_tenantId_defaultStockLocationId_idx" ON "HardwareBusinessSettings"("tenantId", "defaultStockLocationId");

ALTER TABLE "HardwareBusinessSettings" ADD CONSTRAINT "HardwareBusinessSettings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HardwareBusinessSettings" ADD CONSTRAINT "HardwareBusinessSettings_defaultStockLocationId_fkey"
  FOREIGN KEY ("defaultStockLocationId") REFERENCES "HardwareStockLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
