-- CreateEnum
CREATE TYPE "ClientLifecycleStage" AS ENUM ('LEAD', 'PROSPECT', 'CLIENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('NEW', 'ACTIVE', 'ONBOARDING', 'AT_RISK', 'INACTIVE', 'ARCHIVED', 'SOFT_DELETED');

-- CreateEnum
CREATE TYPE "ContactInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClientActivityVerb" AS ENUM ('CREATED', 'UPDATED', 'COMMENTED', 'UPLOADED', 'APPROVED', 'STATUS_CHANGED', 'ARCHIVED', 'DELETED', 'RESTORED');

-- CreateTable
CREATE TABLE "ClientOrganization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "slug" TEXT NOT NULL,
    "lifecycleStage" "ClientLifecycleStage" NOT NULL DEFAULT 'LEAD',
    "status" "ClientStatus" NOT NULL DEFAULT 'NEW',
    "healthScore" INTEGER NOT NULL DEFAULT 75,
    "ownerId" TEXT,
    "accountManagerId" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContactInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "role" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "ContactInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContactInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientActivityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actorId" TEXT,
    "verb" "ClientActivityVerb" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTagAssignment" (
    "clientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ClientTagAssignment_pkey" PRIMARY KEY ("clientId","tagId")
);

-- CreateTable
CREATE TABLE "ClientCustomFieldValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientOrganization_tenantId_lifecycleStage_idx" ON "ClientOrganization"("tenantId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "ClientOrganization_tenantId_status_idx" ON "ClientOrganization"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ClientOrganization_tenantId_accountManagerId_idx" ON "ClientOrganization"("tenantId", "accountManagerId");

-- CreateIndex
CREATE INDEX "ClientOrganization_tenantId_ownerId_idx" ON "ClientOrganization"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "ClientOrganization_tenantId_deletedAt_idx" ON "ClientOrganization"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "ClientOrganization_name_idx" ON "ClientOrganization"("name");

-- CreateIndex
CREATE INDEX "ClientOrganization_createdAt_idx" ON "ClientOrganization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientOrganization_tenantId_slug_key" ON "ClientOrganization"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ClientContact_tenantId_normalizedEmail_idx" ON "ClientContact"("tenantId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_isPrimary_idx" ON "ClientContact"("clientId", "isPrimary");

-- CreateIndex
CREATE INDEX "ClientContact_lastActivityAt_idx" ON "ClientContact"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContact_tenantId_clientId_normalizedEmail_key" ON "ClientContact"("tenantId", "clientId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactInvitation_tokenHash_key" ON "ClientContactInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientContactInvitation_tenantId_clientId_status_idx" ON "ClientContactInvitation"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "ClientContactInvitation_normalizedEmail_idx" ON "ClientContactInvitation"("normalizedEmail");

-- CreateIndex
CREATE INDEX "ClientContactInvitation_expiresAt_idx" ON "ClientContactInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "ClientActivityEvent_tenantId_clientId_occurredAt_idx" ON "ClientActivityEvent"("tenantId", "clientId", "occurredAt");

-- CreateIndex
CREATE INDEX "ClientActivityEvent_tenantId_verb_idx" ON "ClientActivityEvent"("tenantId", "verb");

-- CreateIndex
CREATE INDEX "ClientActivityEvent_actorId_idx" ON "ClientActivityEvent"("actorId");

-- CreateIndex
CREATE INDEX "ClientNote_tenantId_clientId_createdAt_idx" ON "ClientNote"("tenantId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientNote_tenantId_authorId_idx" ON "ClientNote"("tenantId", "authorId");

-- CreateIndex
CREATE INDEX "ClientComment_tenantId_clientId_createdAt_idx" ON "ClientComment"("tenantId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientComment_parentId_idx" ON "ClientComment"("parentId");

-- CreateIndex
CREATE INDEX "ClientComment_resolvedAt_idx" ON "ClientComment"("resolvedAt");

-- CreateIndex
CREATE INDEX "ClientFile_tenantId_clientId_createdAt_idx" ON "ClientFile"("tenantId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientFile_storageKey_idx" ON "ClientFile"("storageKey");

-- CreateIndex
CREATE INDEX "ClientApproval_tenantId_clientId_status_idx" ON "ClientApproval"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "ClientTask_tenantId_clientId_status_idx" ON "ClientTask"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "ClientRequirement_tenantId_clientId_status_idx" ON "ClientRequirement"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "ClientProject_tenantId_clientId_status_idx" ON "ClientProject"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "ClientTag_tenantId_idx" ON "ClientTag"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTag_tenantId_name_key" ON "ClientTag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClientTagAssignment_tagId_idx" ON "ClientTagAssignment"("tagId");

-- CreateIndex
CREATE INDEX "ClientCustomFieldValue_tenantId_fieldKey_idx" ON "ClientCustomFieldValue"("tenantId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCustomFieldValue_tenantId_clientId_fieldKey_key" ON "ClientCustomFieldValue"("tenantId", "clientId", "fieldKey");

-- AddForeignKey
ALTER TABLE "ClientOrganization" ADD CONSTRAINT "ClientOrganization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrganization" ADD CONSTRAINT "ClientOrganization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrganization" ADD CONSTRAINT "ClientOrganization_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactInvitation" ADD CONSTRAINT "ClientContactInvitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactInvitation" ADD CONSTRAINT "ClientContactInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivityEvent" ADD CONSTRAINT "ClientActivityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivityEvent" ADD CONSTRAINT "ClientActivityEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivityEvent" ADD CONSTRAINT "ClientActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ClientComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFile" ADD CONSTRAINT "ClientFile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTask" ADD CONSTRAINT "ClientTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTag" ADD CONSTRAINT "ClientTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTagAssignment" ADD CONSTRAINT "ClientTagAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTagAssignment" ADD CONSTRAINT "ClientTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ClientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCustomFieldValue" ADD CONSTRAINT "ClientCustomFieldValue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

