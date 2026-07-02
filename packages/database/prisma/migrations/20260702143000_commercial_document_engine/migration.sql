-- CreateEnum
CREATE TYPE "CommercialDocumentType" AS ENUM ('QUOTATION', 'PROPOSAL', 'ESTIMATE', 'AGREEMENT', 'WORK_ORDER', 'RECEIPT', 'INVOICE');

-- CreateEnum
CREATE TYPE "CommercialDocumentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommercialDocumentTimelineVerb" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'VERSION_CREATED', 'COMMENTED', 'ATTACHED');

-- CreateTable
CREATE TABLE "CommercialDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "type" "CommercialDocumentType" NOT NULL,
    "status" "CommercialDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "requirementId" TEXT,
    "ownerId" TEXT,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "templateKey" TEXT NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDocumentVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "summary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDocumentTimelineEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorId" TEXT,
    "verb" "CommercialDocumentTimelineVerb" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialDocumentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDocumentComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialDocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDocumentAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialDocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialDocument_tenantId_documentNumber_key" ON "CommercialDocument"("tenantId", "documentNumber");
CREATE INDEX "CommercialDocument_tenantId_type_status_idx" ON "CommercialDocument"("tenantId", "type", "status");
CREATE INDEX "CommercialDocument_tenantId_clientId_idx" ON "CommercialDocument"("tenantId", "clientId");
CREATE INDEX "CommercialDocument_tenantId_projectId_idx" ON "CommercialDocument"("tenantId", "projectId");
CREATE INDEX "CommercialDocument_tenantId_requirementId_idx" ON "CommercialDocument"("tenantId", "requirementId");
CREATE INDEX "CommercialDocument_tenantId_ownerId_idx" ON "CommercialDocument"("tenantId", "ownerId");
CREATE INDEX "CommercialDocument_tenantId_updatedAt_idx" ON "CommercialDocument"("tenantId", "updatedAt");
CREATE INDEX "CommercialDocument_tenantId_archivedAt_idx" ON "CommercialDocument"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialDocumentVersion_documentId_version_key" ON "CommercialDocumentVersion"("documentId", "version");
CREATE INDEX "CommercialDocumentVersion_tenantId_documentId_version_idx" ON "CommercialDocumentVersion"("tenantId", "documentId", "version");

-- CreateIndex
CREATE INDEX "CommercialDocumentTimelineEvent_tenantId_documentId_occurredAt_idx" ON "CommercialDocumentTimelineEvent"("tenantId", "documentId", "occurredAt");
CREATE INDEX "CommercialDocumentTimelineEvent_tenantId_verb_idx" ON "CommercialDocumentTimelineEvent"("tenantId", "verb");
CREATE INDEX "CommercialDocumentTimelineEvent_actorId_idx" ON "CommercialDocumentTimelineEvent"("actorId");

-- CreateIndex
CREATE INDEX "CommercialDocumentComment_tenantId_documentId_createdAt_idx" ON "CommercialDocumentComment"("tenantId", "documentId", "createdAt");
CREATE INDEX "CommercialDocumentComment_parentId_idx" ON "CommercialDocumentComment"("parentId");
CREATE INDEX "CommercialDocumentComment_resolvedAt_idx" ON "CommercialDocumentComment"("resolvedAt");

-- CreateIndex
CREATE INDEX "CommercialDocumentAttachment_tenantId_documentId_createdAt_idx" ON "CommercialDocumentAttachment"("tenantId", "documentId", "createdAt");
CREATE INDEX "CommercialDocumentAttachment_tenantId_version_idx" ON "CommercialDocumentAttachment"("tenantId", "version");
CREATE INDEX "CommercialDocumentAttachment_storageKey_idx" ON "CommercialDocumentAttachment"("storageKey");

-- AddForeignKey
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentVersion" ADD CONSTRAINT "CommercialDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentTimelineEvent" ADD CONSTRAINT "CommercialDocumentTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentTimelineEvent" ADD CONSTRAINT "CommercialDocumentTimelineEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentComment" ADD CONSTRAINT "CommercialDocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentComment" ADD CONSTRAINT "CommercialDocumentComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommercialDocumentComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDocumentAttachment" ADD CONSTRAINT "CommercialDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
