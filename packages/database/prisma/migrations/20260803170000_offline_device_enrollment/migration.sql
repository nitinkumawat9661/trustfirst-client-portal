-- CreateTable
CREATE TABLE "OfflineDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSnapshotAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineDevice_tokenHash_key" ON "OfflineDevice"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineDevice_tenantId_userId_deviceKey_key" ON "OfflineDevice"("tenantId", "userId", "deviceKey");

-- CreateIndex
CREATE INDEX "OfflineDevice_tenantId_status_idx" ON "OfflineDevice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OfflineDevice_userId_revokedAt_idx" ON "OfflineDevice"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "OfflineDevice_lastSeenAt_idx" ON "OfflineDevice"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "OfflineDevice" ADD CONSTRAINT "OfflineDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineDevice" ADD CONSTRAINT "OfflineDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
