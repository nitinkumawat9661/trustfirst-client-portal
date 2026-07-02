ALTER TYPE "AuditAction" ADD VALUE 'HARDWARE_CATALOG_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'HARDWARE_STOCK_MOVED';

CREATE TYPE "HardwareInventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT');
CREATE TYPE "HardwareTimelineVerb" AS ENUM ('PRODUCT_CREATED', 'PRODUCT_UPDATED', 'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTED', 'LOW_STOCK_ALERTED', 'IMPORT_PREVIEWED', 'EXPORTED');

CREATE TABLE "HardwareProductCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareBrand" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareBrand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareUnit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "precision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareProduct" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "categoryId" TEXT,
  "brandId" TEXT,
  "unitId" TEXT,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "barcode" TEXT,
  "gstTaxConfig" JSONB NOT NULL DEFAULT '{}',
  "salesPriceCents" INTEGER NOT NULL DEFAULT 0,
  "purchaseCostCents" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareStockLocation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareStockLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareInventoryMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "type" "HardwareInventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCostCents" INTEGER,
  "unitPriceCents" INTEGER,
  "supplierId" TEXT,
  "customerId" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HardwareInventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareTimelineEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT,
  "actorId" TEXT,
  "verb" "HardwareTimelineVerb" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HardwareTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HardwareProductCategory_tenantId_slug_key" ON "HardwareProductCategory"("tenantId", "slug");
CREATE INDEX "HardwareProductCategory_tenantId_name_idx" ON "HardwareProductCategory"("tenantId", "name");
CREATE UNIQUE INDEX "HardwareBrand_tenantId_slug_key" ON "HardwareBrand"("tenantId", "slug");
CREATE INDEX "HardwareBrand_tenantId_name_idx" ON "HardwareBrand"("tenantId", "name");
CREATE UNIQUE INDEX "HardwareUnit_tenantId_code_key" ON "HardwareUnit"("tenantId", "code");
CREATE INDEX "HardwareUnit_tenantId_name_idx" ON "HardwareUnit"("tenantId", "name");
CREATE UNIQUE INDEX "HardwareProduct_tenantId_sku_key" ON "HardwareProduct"("tenantId", "sku");
CREATE INDEX "HardwareProduct_tenantId_name_idx" ON "HardwareProduct"("tenantId", "name");
CREATE INDEX "HardwareProduct_tenantId_barcode_idx" ON "HardwareProduct"("tenantId", "barcode");
CREATE INDEX "HardwareProduct_tenantId_categoryId_idx" ON "HardwareProduct"("tenantId", "categoryId");
CREATE INDEX "HardwareProduct_tenantId_brandId_idx" ON "HardwareProduct"("tenantId", "brandId");
CREATE INDEX "HardwareProduct_tenantId_archivedAt_idx" ON "HardwareProduct"("tenantId", "archivedAt");
CREATE UNIQUE INDEX "HardwareStockLocation_tenantId_code_key" ON "HardwareStockLocation"("tenantId", "code");
CREATE INDEX "HardwareStockLocation_tenantId_name_idx" ON "HardwareStockLocation"("tenantId", "name");
CREATE INDEX "HardwareInventoryMovement_tenantId_productId_occurredAt_idx" ON "HardwareInventoryMovement"("tenantId", "productId", "occurredAt");
CREATE INDEX "HardwareInventoryMovement_tenantId_locationId_occurredAt_idx" ON "HardwareInventoryMovement"("tenantId", "locationId", "occurredAt");
CREATE INDEX "HardwareInventoryMovement_tenantId_type_idx" ON "HardwareInventoryMovement"("tenantId", "type");
CREATE INDEX "HardwareInventoryMovement_tenantId_supplierId_idx" ON "HardwareInventoryMovement"("tenantId", "supplierId");
CREATE INDEX "HardwareInventoryMovement_tenantId_customerId_idx" ON "HardwareInventoryMovement"("tenantId", "customerId");
CREATE INDEX "HardwareTimelineEvent_tenantId_productId_occurredAt_idx" ON "HardwareTimelineEvent"("tenantId", "productId", "occurredAt");
CREATE INDEX "HardwareTimelineEvent_tenantId_verb_idx" ON "HardwareTimelineEvent"("tenantId", "verb");
CREATE INDEX "HardwareTimelineEvent_actorId_idx" ON "HardwareTimelineEvent"("actorId");

ALTER TABLE "HardwareProductCategory" ADD CONSTRAINT "HardwareProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareBrand" ADD CONSTRAINT "HardwareBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareUnit" ADD CONSTRAINT "HardwareUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareProduct" ADD CONSTRAINT "HardwareProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareProduct" ADD CONSTRAINT "HardwareProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HardwareProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareProduct" ADD CONSTRAINT "HardwareProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "HardwareBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareProduct" ADD CONSTRAINT "HardwareProduct_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "HardwareUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareStockLocation" ADD CONSTRAINT "HardwareStockLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareInventoryMovement" ADD CONSTRAINT "HardwareInventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareInventoryMovement" ADD CONSTRAINT "HardwareInventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "HardwareProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareInventoryMovement" ADD CONSTRAINT "HardwareInventoryMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "HardwareStockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareInventoryMovement" ADD CONSTRAINT "HardwareInventoryMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareInventoryMovement" ADD CONSTRAINT "HardwareInventoryMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTimelineEvent" ADD CONSTRAINT "HardwareTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareTimelineEvent" ADD CONSTRAINT "HardwareTimelineEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "HardwareProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
