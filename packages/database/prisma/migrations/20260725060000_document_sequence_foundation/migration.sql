CREATE TYPE "DocumentSequenceKind" AS ENUM ('INVOICE', 'RECEIPT');

CREATE TABLE "DocumentSequence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" "DocumentSequenceKind" NOT NULL,
  "financialYear" TEXT NOT NULL,
  "lastValue" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentSequence_tenantId_kind_financialYear_key"
  ON "DocumentSequence"("tenantId", "kind", "financialYear");

CREATE INDEX "DocumentSequence_tenantId_financialYear_idx"
  ON "DocumentSequence"("tenantId", "financialYear");

ALTER TABLE "DocumentSequence"
  ADD CONSTRAINT "DocumentSequence_tenantId_fkey"
  FOREIGN KEY ("tenantId")
  REFERENCES "Tenant"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;