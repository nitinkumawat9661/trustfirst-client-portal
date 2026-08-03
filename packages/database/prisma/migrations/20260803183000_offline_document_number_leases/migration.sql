-- CreateTable
CREATE TABLE "OfflineDocumentLease" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "startValue" INTEGER NOT NULL,
    "endValue" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "exhaustedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineDocumentLease_pkey" PRIMARY KEY ("id")
);

-- Prevent invalid or overlapping local counters inside a lease row.
ALTER TABLE "OfflineDocumentLease"
    ADD CONSTRAINT "OfflineDocumentLease_range_check"
    CHECK ("startValue" > 0 AND "endValue" >= "startValue" AND "nextValue" >= "startValue" AND "nextValue" <= "endValue" + 1);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineDocumentLease_tenantId_series_financialYear_startValue_key"
    ON "OfflineDocumentLease"("tenantId", "series", "financialYear", "startValue");

-- CreateIndex
CREATE INDEX "OfflineDocumentLease_deviceId_status_idx"
    ON "OfflineDocumentLease"("deviceId", "status");

-- CreateIndex
CREATE INDEX "OfflineDocumentLease_tenantId_series_financialYear_endValue_idx"
    ON "OfflineDocumentLease"("tenantId", "series", "financialYear", "endValue");

-- CreateIndex
CREATE INDEX "OfflineDocumentLease_expiresAt_idx"
    ON "OfflineDocumentLease"("expiresAt");

-- AddForeignKey
ALTER TABLE "OfflineDocumentLease" ADD CONSTRAINT "OfflineDocumentLease_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineDocumentLease" ADD CONSTRAINT "OfflineDocumentLease_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "OfflineDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
