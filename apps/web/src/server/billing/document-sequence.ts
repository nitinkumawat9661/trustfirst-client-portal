import { DocumentSequenceKind, type Prisma } from "@trustfirst/database";

type AllocateDocumentNumberInput = {
  financialYear?: string;
  kind: DocumentSequenceKind;
  occurredAt?: Date;
  prefix: string;
  tenantId: string;
};

export async function allocateDocumentNumber(
  tx: Prisma.TransactionClient,
  input: AllocateDocumentNumberInput,
) {
  const financialYear =
    input.financialYear ?? financialYearForDate(input.occurredAt ?? new Date());

  const sequence = await tx.documentSequence.upsert({
    create: {
      financialYear,
      kind: input.kind,
      lastValue: 1,
      tenantId: input.tenantId,
    },
    select: {
      lastValue: true,
    },
    update: {
      lastValue: {
        increment: 1,
      },
    },
    where: {
      tenantId_kind_financialYear: {
        financialYear,
        kind: input.kind,
        tenantId: input.tenantId,
      },
    },
  });

  return `${normalizePrefix(input.prefix)}/${financialYear}/${sequence.lastValue
    .toString()
    .padStart(5, "0")}`;
}

export function financialYearForDate(date: Date) {
  const calendarYear = date.getUTCFullYear();
  const financialYearStart =
    date.getUTCMonth() >= 3 ? calendarYear : calendarYear - 1;

  return `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`;
}

function normalizePrefix(prefix: string) {
  const normalized = prefix.trim().replace(/\/+$/u, "");

  if (!normalized) {
    throw new Error("Document number prefix is required.");
  }

  return normalized;
}