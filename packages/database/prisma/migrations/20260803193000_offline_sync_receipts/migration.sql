-- CreateTable
CREATE TABLE "OfflineSyncReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "queueItemId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineSyncReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSyncReceipt_deviceId_queueItemId_key"
    ON "OfflineSyncReceipt"("deviceId", "queueItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSyncReceipt_tenantId_idempotencyKey_key"
    ON "OfflineSyncReceipt"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OfflineSyncReceipt_tenantId_status_createdAt_idx"
    ON "OfflineSyncReceipt"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OfflineSyncReceipt_deviceId_createdAt_idx"
    ON "OfflineSyncReceipt"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "OfflineSyncReceipt" ADD CONSTRAINT "OfflineSyncReceipt_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineSyncReceipt" ADD CONSTRAINT "OfflineSyncReceipt_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "OfflineDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
