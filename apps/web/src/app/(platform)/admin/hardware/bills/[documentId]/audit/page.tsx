import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareBillEditService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareBillAuditPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const service = new HardwareBillEditService(getPrisma());
  const [bill, history] = await Promise.all([
    service.billForAudit(context, documentId),
    service.auditHistory(context, documentId),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Immutable before/after snapshots and the exact reversal and repost records created by every correction." eyebrow="Bill audit" title={bill.documentNumber} />
      {history.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">This bill has not been edited.</CardContent></Card> : history.map((entry) => (
        <Card key={entry.id}>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{entry.reason}</CardTitle><Badge>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.occurredAt))}</Badge></div><p className="text-sm text-muted-foreground">Changed by {entry.actorName}</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><EffectIds label="Reversal records" values={entry.reversalIds} /><EffectIds label="Corrected repost records" values={entry.repostIds} /></div>
            <div className="grid gap-3 xl:grid-cols-2"><Snapshot label="Before snapshot" value={entry.before} /><Snapshot label="After snapshot" value={entry.after} /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EffectIds({ label, values }: { label: string; values: string[] }) { return <div className="rounded-md border border-border p-3"><p className="text-sm font-medium">{label}</p><ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">{values.map((value) => <li className="break-all" key={value}>{value}</li>)}</ul></div>; }
function Snapshot({ label, value }: { label: string; value: Record<string, unknown> }) { return <details className="rounded-md border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{label}</summary><pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre></details>; }
