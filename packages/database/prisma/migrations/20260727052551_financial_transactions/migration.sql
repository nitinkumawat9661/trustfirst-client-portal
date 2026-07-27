-- CreateEnum
CREATE TYPE "FinancialPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'TENANT');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('SALE_RECEIVABLE', 'SALE_CANCELLATION_REVERSAL', 'SALE_RETURN_CREDIT', 'CUSTOMER_PAYMENT', 'CUSTOMER_ADVANCE', 'ADVANCE_ALLOCATION', 'CUSTOMER_REFUND_PENDING', 'CUSTOMER_REFUND_PAID', 'PAYMENT_REVERSAL', 'REFUND_REVERSAL', 'MANUAL_DEBIT_ADJUSTMENT', 'MANUAL_CREDIT_ADJUSTMENT', 'PURCHASE_PAYABLE', 'PURCHASE_RETURN_CREDIT', 'SUPPLIER_PAYMENT', 'SUPPLIER_ADVANCE', 'SUPPLIER_REFUND_RECEIVED', 'SUPPLIER_PAYMENT_REVERSAL');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FinancialAllocationType" AS ENUM ('INVOICE_PAYMENT', 'ADVANCE_TO_INVOICE', 'REFUND_SETTLEMENT', 'PAYMENT_REVERSAL', 'SUPPLIER_BILL_PAYMENT', 'SUPPLIER_ADVANCE_TO_BILL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentSequenceKind" ADD VALUE 'PAYMENT_VOUCHER';
ALTER TYPE "DocumentSequenceKind" ADD VALUE 'REFUND';
ALTER TYPE "DocumentSequenceKind" ADD VALUE 'ADJUSTMENT';

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "partyType" "FinancialPartyType" NOT NULL,
    "partyId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "debitCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode",
    "externalReference" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "sourceNumber" TEXT,
    "invoiceId" TEXT,
    "hardwareDocumentId" TEXT,
    "reversalOfId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdById" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromTransactionId" TEXT NOT NULL,
    "toTransactionId" TEXT,
    "invoiceId" TEXT,
    "hardwareDocumentId" TEXT,
    "type" "FinancialAllocationType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_partyType_partyId_occurredAt_idx" ON "FinancialTransaction"("tenantId", "partyType", "partyId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_type_status_occurredAt_idx" ON "FinancialTransaction"("tenantId", "type", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_sourceType_sourceId_idx" ON "FinancialTransaction"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_invoiceId_idx" ON "FinancialTransaction"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_hardwareDocumentId_idx" ON "FinancialTransaction"("tenantId", "hardwareDocumentId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_tenantId_reversalOfId_idx" ON "FinancialTransaction"("tenantId", "reversalOfId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_tenantId_transactionNumber_key" ON "FinancialTransaction"("tenantId", "transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_tenantId_idempotencyKey_key" ON "FinancialTransaction"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialAllocation_tenantId_fromTransactionId_idx" ON "FinancialAllocation"("tenantId", "fromTransactionId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_tenantId_toTransactionId_idx" ON "FinancialAllocation"("tenantId", "toTransactionId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_tenantId_invoiceId_idx" ON "FinancialAllocation"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_tenantId_hardwareDocumentId_idx" ON "FinancialAllocation"("tenantId", "hardwareDocumentId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_tenantId_sourceType_sourceId_idx" ON "FinancialAllocation"("tenantId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_hardwareDocumentId_fkey" FOREIGN KEY ("hardwareDocumentId") REFERENCES "HardwareTradeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_fromTransactionId_fkey" FOREIGN KEY ("fromTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_toTransactionId_fkey" FOREIGN KEY ("toTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_hardwareDocumentId_fkey" FOREIGN KEY ("hardwareDocumentId") REFERENCES "HardwareTradeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CommercialDocumentTimelineEvent_tenantId_documentId_occurredAt_" RENAME TO "CommercialDocumentTimelineEvent_tenantId_documentId_occurre_idx";
