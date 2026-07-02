import { getPrisma } from "@trustfirst/database";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@trustfirst/ui";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderKanban,
  HeartPulse,
  ListChecks,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/session";
import { ClientService, type ClientDashboardMetrics, type ClientSummary } from "@/server/crm";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function ClientPage() {
  const user = await requireCurrentUser();
  const service = new ClientService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [clients, metrics]: [ClientSummary[], ClientDashboardMetrics] = await Promise.all([
    service.listClients(context),
    service.getDashboard(context),
  ]);
  const cards = [
    { icon: FolderKanban, label: "Active Projects", value: metrics.activeProjects },
    { icon: ShieldCheck, label: "Pending Approvals", value: metrics.pendingApprovals },
    { icon: FileText, label: "Pending Requirements", value: metrics.pendingRequirements },
    { icon: ListChecks, label: "Open Tasks", value: metrics.openTasks },
    { icon: CheckCircle2, label: "Recent Files", value: metrics.recentFiles },
    { icon: Activity, label: "Recent Activity", value: metrics.recentActivity },
    { icon: HeartPulse, label: "Health Score", value: `${metrics.healthScore}%` },
  ];

  return (
    <AppShell mode="client">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge>CRM</Badge>
          <h1 className="mt-4 text-3xl font-semibold">Client dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Tenant-aware workspace for client relationships, contacts, activity,
            and operational follow-up.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/client?search=clients">
            <Search className="size-4" />
            Search clients
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
              <card.icon aria-hidden className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client organizations</CardTitle>
            <CardDescription>
              Lead, prospect, client, and archived account lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No client organizations are available for this tenant yet.
              </div>
            ) : (
              clients.map((client) => (
                <Link
                  className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-muted"
                  href={`/client/${client.id}`}
                  key={client.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{client.name}</p>
                      <Badge>{client.lifecycleStage.toLowerCase()}</Badge>
                      <Badge>{client.status.toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {client.primaryContact?.email ?? "No primary contact"} · Health{" "}
                      {client.healthScore}%
                    </p>
                  </div>
                  <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace readiness</CardTitle>
            <CardDescription>CRM collaboration surfaces are enabled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Contacts, notes, comments, timeline, import preview, and export contracts are tenant scoped.</p>
            <Button asChild size="sm">
              <Link href="/client/requirements/new">
                New requirement
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
