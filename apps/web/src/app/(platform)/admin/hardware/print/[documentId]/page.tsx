import { getPrisma } from "@trustfirst/database";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService, type HardwarePrintProjection } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePrintPreviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const projection = await loadProjection(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });

  return (
    <main className="min-h-screen bg-muted p-4 print:bg-white print:p-0">
      <section className="mx-auto max-w-4xl bg-white p-8 text-black shadow print:shadow-none">
        <style>{`
          @media print {
            @page { size: A4; margin: 12mm; }
            .no-print { display: none; }
          }
        `}</style>
        <p className="no-print mb-4 rounded-md border px-3 py-2 text-sm">
          Use browser print
        </p>
        <header className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{projection.firm.firmName}</h1>
            <p className="text-sm">{Object.values(projection.firm.address).join(", ")}</p>
            <p className="text-sm">{projection.firm.phone} {projection.firm.email}</p>
            <p className="text-sm">GSTIN: {projection.firm.gstin ?? "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{projection.document.documentNumber}</p>
            <p className="text-sm">{projection.document.type.replaceAll("_", " ")}</p>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-4 border-b py-4 text-sm">
          <div>
            <p className="font-semibold">Customer</p>
            <p>{projection.customer?.name ?? "-"}</p>
          </div>
          <div>
            <p className="font-semibold">Totals in words</p>
            <p>{projection.document.totalsInWords}</p>
          </div>
        </section>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>GST</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {projection.items.map((item) => (
              <tr className="border-b" key={`${item.description}-${item.lineTotalCents}`}>
                <td className="py-2">{item.description}</td>
                <td>{item.quantity}</td>
                <td>{item.unitAmountCents / 100}</td>
                <td>{item.discountCents / 100}</td>
                <td>{item.taxCents / 100}</td>
                <td className="text-right">{item.lineTotalCents / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="font-semibold">GST Summary</p>
            {projection.gstSummary.map((row) => (
              <p className="text-sm" key={row.taxRateBps}>
                {row.taxRateBps / 100}% on {row.taxableCents / 100}: {row.taxCents / 100}
              </p>
            ))}
          </div>
          <div className="text-right text-sm">
            <p>Subtotal: {projection.document.subtotalCents / 100}</p>
            <p>Discount: {projection.document.discountCents / 100}</p>
            <p>GST: {projection.document.taxCents / 100}</p>
            <p>Round off: {projection.document.roundOffCents / 100}</p>
            <p className="text-lg font-bold">Total: {projection.document.totalCents / 100}</p>
          </div>
        </section>
        <footer className="mt-10 grid grid-cols-2 gap-8 pt-8 text-sm">
          <p>{projection.firm.termsFooter ?? "Terms configurable in hardware settings."}</p>
          <div className="text-right">
            <div className="ml-auto mt-10 w-48 border-t pt-2">{projection.signatureLabel}</div>
          </div>
        </footer>
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
