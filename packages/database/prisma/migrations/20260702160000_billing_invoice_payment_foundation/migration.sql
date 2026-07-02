-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BILLING_INVOICE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'BILLING_INVOICE_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'BILLING_PAYMENT_RECORDED';

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY', 'STRIPE', 'PHONEPE', 'UPI_QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingTimelineVerb" AS ENUM ('INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_ISSUED', 'INVOICE_VOIDED', 'INVOICE_ARCHIVED', 'PAYMENT_RECORDED', 'COMMENTED', 'ATTACHED');

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "billingEmail" TEXT,
    "taxIdentifier" TEXT,
    "address" JSONB NOT NULL DEFAULT '{}',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentTerms" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "requirementId" TEXT,
    "commercialDocumentId" TEXT,
    "ownerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmountCents" INTEGER NOT NULL,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "paymentTerms" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "reference" TEXT,
    "receiptDocumentId" TEXT,
    "recordedById" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTimelineEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "actorId" TEXT,
    "verb" "BillingTimelineVerb" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_tenantId_clientId_key" ON "BillingProfile"("tenantId", "clientId");
CREATE INDEX "BillingProfile_tenantId_billingEmail_idx" ON "BillingProfile"("tenantId", "billingEmail");
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX "Invoice_tenantId_clientId_idx" ON "Invoice"("tenantId", "clientId");
CREATE INDEX "Invoice_tenantId_projectId_idx" ON "Invoice"("tenantId", "projectId");
CREATE INDEX "Invoice_tenantId_requirementId_idx" ON "Invoice"("tenantId", "requirementId");
CREATE INDEX "Invoice_tenantId_ownerId_idx" ON "Invoice"("tenantId", "ownerId");
CREATE INDEX "Invoice_tenantId_dueAt_idx" ON "Invoice"("tenantId", "dueAt");
CREATE INDEX "Invoice_tenantId_updatedAt_idx" ON "Invoice"("tenantId", "updatedAt");
CREATE INDEX "PaymentRecord_tenantId_invoiceId_receivedAt_idx" ON "PaymentRecord"("tenantId", "invoiceId", "receivedAt");
CREATE INDEX "PaymentRecord_tenantId_provider_idx" ON "PaymentRecord"("tenantId", "provider");
CREATE INDEX "PaymentRecord_tenantId_mode_idx" ON "PaymentRecord"("tenantId", "mode");
CREATE INDEX "PaymentRecord_receiptDocumentId_idx" ON "PaymentRecord"("receiptDocumentId");
CREATE INDEX "BillingTimelineEvent_tenantId_invoiceId_occurredAt_idx" ON "BillingTimelineEvent"("tenantId", "invoiceId", "occurredAt");
CREATE INDEX "BillingTimelineEvent_tenantId_verb_idx" ON "BillingTimelineEvent"("tenantId", "verb");
CREATE INDEX "BillingTimelineEvent_actorId_idx" ON "BillingTimelineEvent"("actorId");
CREATE INDEX "InvoiceComment_tenantId_invoiceId_createdAt_idx" ON "InvoiceComment"("tenantId", "invoiceId", "createdAt");
CREATE INDEX "InvoiceComment_parentId_idx" ON "InvoiceComment"("parentId");
CREATE INDEX "InvoiceComment_resolvedAt_idx" ON "InvoiceComment"("resolvedAt");
CREATE INDEX "InvoiceAttachment_tenantId_invoiceId_createdAt_idx" ON "InvoiceAttachment"("tenantId", "invoiceId", "createdAt");
CREATE INDEX "InvoiceAttachment_storageKey_idx" ON "InvoiceAttachment"("storageKey");

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_commercialDocumentId_fkey" FOREIGN KEY ("commercialDocumentId") REFERENCES "CommercialDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "CommercialDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingTimelineEvent" ADD CONSTRAINT "BillingTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingTimelineEvent" ADD CONSTRAINT "BillingTimelineEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceComment" ADD CONSTRAINT "InvoiceComment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceComment" ADD CONSTRAINT "InvoiceComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InvoiceComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
