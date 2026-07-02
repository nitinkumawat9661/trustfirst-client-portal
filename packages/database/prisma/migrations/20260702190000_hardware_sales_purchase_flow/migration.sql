CREATE TYPE "HardwareTradeDocumentType" AS ENUM ('SALES_ORDER', 'PURCHASE_ORDER', 'SALES_QUOTATION', 'PURCHASE_ENTRY', 'SUPPLIER_BILL', 'SALE_RETURN', 'PURCHASE_RETURN');
CREATE TYPE "HardwareTradeDocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "HardwareTradeTimelineVerb" AS ENUM ('CREATED', 'UPDATED', 'CONFIRMED', 'CANCELLED', 'RETURNED', 'INVOICE_DRAFTED');

CREATE TABLE "HardwareTradeDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "type" "HardwareTradeDocumentType" NOT NULL,
  "status" "HardwareTradeDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "customerId" TEXT,
  "supplierId" TEXT,
  "projectId" TEXT,
  "requirementId" TEXT,
  "billingInvoiceId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "roundOffCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unlinked',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "confirmedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardwareTradeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareTradeDocumentItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitAmountCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "lineTotalCents" INTEGER NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "HardwareTradeDocumentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HardwareTradeTimelineEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "actorId" TEXT,
  "verb" "HardwareTradeTimelineVerb" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HardwareTradeTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HardwareTradeDocument_tenantId_documentNumber_key" ON "HardwareTradeDocument"("tenantId", "documentNumber");
CREATE INDEX "HardwareTradeDocument_tenantId_type_status_idx" ON "HardwareTradeDocument"("tenantId", "type", "status");
CREATE INDEX "HardwareTradeDocument_tenantId_customerId_idx" ON "HardwareTradeDocument"("tenantId", "customerId");
CREATE INDEX "HardwareTradeDocument_tenantId_supplierId_idx" ON "HardwareTradeDocument"("tenantId", "supplierId");
CREATE INDEX "HardwareTradeDocument_tenantId_billingInvoiceId_idx" ON "HardwareTradeDocument"("tenantId", "billingInvoiceId");
CREATE INDEX "HardwareTradeDocument_tenantId_updatedAt_idx" ON "HardwareTradeDocument"("tenantId", "updatedAt");
CREATE INDEX "HardwareTradeDocumentItem_tenantId_documentId_idx" ON "HardwareTradeDocumentItem"("tenantId", "documentId");
CREATE INDEX "HardwareTradeDocumentItem_tenantId_productId_idx" ON "HardwareTradeDocumentItem"("tenantId", "productId");
CREATE INDEX "HardwareTradeTimelineEvent_tenantId_documentId_occurredAt_idx" ON "HardwareTradeTimelineEvent"("tenantId", "documentId", "occurredAt");
CREATE INDEX "HardwareTradeTimelineEvent_tenantId_verb_idx" ON "HardwareTradeTimelineEvent"("tenantId", "verb");
CREATE INDEX "HardwareTradeTimelineEvent_actorId_idx" ON "HardwareTradeTimelineEvent"("actorId");

ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocument" ADD CONSTRAINT "HardwareTradeDocument_billingInvoiceId_fkey" FOREIGN KEY ("billingInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocumentItem" ADD CONSTRAINT "HardwareTradeDocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HardwareTradeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeDocumentItem" ADD CONSTRAINT "HardwareTradeDocumentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "HardwareProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeTimelineEvent" ADD CONSTRAINT "HardwareTradeTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareTradeTimelineEvent" ADD CONSTRAINT "HardwareTradeTimelineEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HardwareTradeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
