import { AutoPrintController } from "@/components/hardware/auto-print-controller";
import HardwarePrintPreviewPage from "../../../../(platform)/admin/hardware/print/[documentId]/page";

export const dynamic = "force-dynamic";

type StandalonePrintSearchParams = {
  autoprint?: string;
  format?: string;
  invoiceOnly?: string;
  requestId?: string;
  title?: string;
};

export default async function StandaloneHardwarePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<StandalonePrintSearchParams>;
}) {
  const query = await searchParams;
  const autoPrint = query.autoprint === "1";
  const previewSearchParams: Promise<{ format?: string }> = Promise.resolve(
    query.format ? { format: query.format } : {},
  );

  return (
    <>
      {autoPrint ? (
        <>
          <style>{`
            .standalone-auto-print .no-print { display: none !important; }
            .standalone-auto-print > main {
              min-height: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
          `}</style>
          <AutoPrintController
            documentTitle={query.title}
            enabled
            invoiceOnly={query.invoiceOnly === "1"}
            requestId={query.requestId}
          />
        </>
      ) : null}
      <div className={autoPrint ? "standalone-auto-print" : undefined}>
        <HardwarePrintPreviewPage params={params} searchParams={previewSearchParams} />
      </div>
    </>
  );
}
