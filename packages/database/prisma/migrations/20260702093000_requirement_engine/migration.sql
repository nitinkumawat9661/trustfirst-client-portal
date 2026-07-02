-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequirementTimelineVerb" AS ENUM ('CREATED', 'DRAFT_SAVED', 'SUBMITTED', 'REVIEW_REQUESTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'COMMENTED', 'ATTACHED', 'ASSIGNED', 'VERSION_CREATED', 'VERSION_RESTORED');

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "ownerId" TEXT,
    "reviewerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "formSchema" JSONB NOT NULL DEFAULT '{}',
    "draftData" JSONB NOT NULL DEFAULT '{}',
    "submittedData" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "authorId" TEXT,
    "data" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementTimelineEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "actorId" TEXT,
    "verb" "RequirementTimelineVerb" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "version" INTEGER,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "recipientId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Requirement_tenantId_status_idx" ON "Requirement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_clientId_idx" ON "Requirement"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_ownerId_idx" ON "Requirement"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_reviewerId_idx" ON "Requirement"("tenantId", "reviewerId");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_updatedAt_idx" ON "Requirement"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "Requirement_dueAt_idx" ON "Requirement"("dueAt");

-- CreateIndex
CREATE INDEX "RequirementDraft_tenantId_requirementId_createdAt_idx" ON "RequirementDraft"("tenantId", "requirementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDraft_requirementId_revision_key" ON "RequirementDraft"("requirementId", "revision");

-- CreateIndex
CREATE INDEX "RequirementVersion_tenantId_requirementId_version_idx" ON "RequirementVersion"("tenantId", "requirementId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementVersion_requirementId_version_key" ON "RequirementVersion"("requirementId", "version");

-- CreateIndex
CREATE INDEX "RequirementTimelineEvent_tenantId_requirementId_occurredAt_idx" ON "RequirementTimelineEvent"("tenantId", "requirementId", "occurredAt");

-- CreateIndex
CREATE INDEX "RequirementTimelineEvent_tenantId_verb_idx" ON "RequirementTimelineEvent"("tenantId", "verb");

-- CreateIndex
CREATE INDEX "RequirementTimelineEvent_actorId_idx" ON "RequirementTimelineEvent"("actorId");

-- CreateIndex
CREATE INDEX "RequirementAttachment_tenantId_requirementId_idx" ON "RequirementAttachment"("tenantId", "requirementId");

-- CreateIndex
CREATE INDEX "RequirementAttachment_tenantId_version_idx" ON "RequirementAttachment"("tenantId", "version");

-- CreateIndex
CREATE INDEX "RequirementAttachment_storageKey_idx" ON "RequirementAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "RequirementComment_tenantId_requirementId_createdAt_idx" ON "RequirementComment"("tenantId", "requirementId", "createdAt");

-- CreateIndex
CREATE INDEX "RequirementComment_parentId_idx" ON "RequirementComment"("parentId");

-- CreateIndex
CREATE INDEX "RequirementComment_resolvedAt_idx" ON "RequirementComment"("resolvedAt");

-- CreateIndex
CREATE INDEX "RequirementNotification_tenantId_recipientId_readAt_idx" ON "RequirementNotification"("tenantId", "recipientId", "readAt");

-- CreateIndex
CREATE INDEX "RequirementNotification_tenantId_requirementId_createdAt_idx" ON "RequirementNotification"("tenantId", "requirementId", "createdAt");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDraft" ADD CONSTRAINT "RequirementDraft_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTimelineEvent" ADD CONSTRAINT "RequirementTimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTimelineEvent" ADD CONSTRAINT "RequirementTimelineEvent_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTimelineEvent" ADD CONSTRAINT "RequirementTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementAttachment" ADD CONSTRAINT "RequirementAttachment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementComment" ADD CONSTRAINT "RequirementComment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementComment" ADD CONSTRAINT "RequirementComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementComment" ADD CONSTRAINT "RequirementComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequirementComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementNotification" ADD CONSTRAINT "RequirementNotification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

