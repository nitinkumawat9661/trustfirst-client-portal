import { getPrisma } from "@trustfirst/database";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/hardware/print-button";
import {
  ReferenceBillDocument,
  type ReferenceTaxMode,
} from "@/features/hardware/printing/reference-bill-layout";
import { ReferenceBillStyles } from "@/features/hardware/printing/reference-bill-styles";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService, type HardwarePrintProjection } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePrintPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { documentId } = await params;
  const { print } = await searchParams;
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const projection = await loadProjection(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const isEstimate = projection.document.type === "SALES_QUOTATION";
  const taxMode: ReferenceTaxMode = projection.document.metadata.taxMode === "inter-state"
    ? "inter-state"
    : "intra-state";
  const documentAddress = typeof projection.document.metadata.customerAddress === "string"
    ? projection.document.metadata.customerAddress
    : projection.customer?.address ?? null;
  const documentDate = typeof projection.document.metadata.documentDate === "string"
    ? projection.document.metadata.documentDate
    : projection.document.createdAt;
  const customerName = projection.customer?.name ?? "Walk-in Customer";
  const pdfFileName = buildPdfFileName(projection.document.documentNumber, customerName);

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:min-h-0 print:bg-white print:p-0">
      <section className="print-sheet mx-auto w-full max-w-[210mm]">
        <ReferenceBillStyles />
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">A4 {isEstimate ? "Estimate Bill" : "invoice"} preview</p>
            <p className="text-xs text-zinc-600">PDF name: {pdfFileName}.pdf</p>
          </div>
          <PrintButton
            autoPrint={print === "1"}
            fileName={pdfFileName}
            label={isEstimate ? "Print Estimate Bill" : "Print A4 invoice"}
          />
        </div>
        <ReferenceBillDocument
          customerName={customerName}
          documentAddress={documentAddress}
          documentDate={documentDate}
          projection={projection}
          taxMode={taxMode}
        />
      </section>
    </main>
  );
}

async function loadProjection(
  service: HardwareTradeService,
  input: { documentId: string; tenantId: string; userId: string },
): Promise<HardwarePrintProjection> {
  try {
    return await service.printProjection(
      { tenantId: input.tenantId, userId: input.userId },
      input.documentId,
    );
  } catch {
    notFound();
  }
}

function buildPdfFileName(documentNumber: string, customerName: string) {
  const safeDocumentNumber = sanitizeFilePart(documentNumber) || "Invoice";
  const safeCustomerName = sanitizeFilePart(customerName).slice(0, 80) || "Walk-in Customer";
  return `${safeDocumentNumber} - ${safeCustomerName}`;
}

function sanitizeFilePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/[. ]+$/gu, "")
    .trim();
}
