import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { HardwareDemoChecklist } from "@/components/hardware/hardware-demo-checklist";
import { HardwareDemoControlPanel } from "@/components/hardware/hardware-demo-control-panel";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";
import { deploymentReadinessChecklist } from "@/server/deployment/readiness";

export const dynamic = "force-dynamic";

export default async function HardwareDemoPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const readiness = await service.demoReadiness({
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const deployment = deploymentReadinessChecklist();

  return (
    <div className="space-y-6">
      <div>
        <Badge>Demo QA</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Hardware ERP demo readiness</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Checklist, demo controls, and preview deployment readiness for a real client walkthrough.
        </p>
      </div>
      <HardwareDemoChecklist readiness={readiness} />
      <HardwareDemoControlPanel />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {deployment.map((item) => (
          <div className="rounded-md border border-border p-4" key={item.key}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.title}</p>
              <Badge>{item.ready ? "ok" : "check"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
