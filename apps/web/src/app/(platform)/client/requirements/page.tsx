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
import { ArrowRight, ClipboardCheck, Clock3, FileText, Save } from "lucide-react";
import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/session";
import { RequirementService } from "@/server/requirements";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function RequirementsDashboardPage() {
  const user = await requireCurrentUser();
  const service = new RequirementService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const dashboard = await service.dashboard(context);
  const cards = [
    { icon: FileText, label: "Total Requirements", value: dashboard.total },
    { icon: Save, label: "Drafts", value: dashboard.drafts },
    { icon: ClipboardCheck, label: "Pending Review", value: dashboard.pendingReview },
    { icon: Clock3, label: "Recently Updated", value: dashboard.recentlyUpdated.length },
  ];

  return (
    <AppShell mode="client">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge>Requirement Engine</Badge>
          <h1 className="mt-4 text-3xl font-semibold">Requirement dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Drafts, approvals, versioning, assignments, comments, and timeline
            activity for tenant-scoped requirements.
          </p>
        </div>
        <Button asChild>
          <Link href="/client/requirements/new">
            New requirement
            <ArrowRight className="size-4" />
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recently updated</CardTitle>
          <CardDescription>Latest requirement activity across this tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.recentlyUpdated.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
              No requirements have been created yet.
            </div>
          ) : (
            dashboard.recentlyUpdated.map((requirement) => (
              <div
                className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={requirement.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{requirement.title}</p>
                    <Badge>{requirement.status.toLowerCase().replaceAll("_", " ")}</Badge>
                    <Badge>v{requirement.currentVersion}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Priority {requirement.priority.toLowerCase()} · Updated{" "}
                    {requirement.updatedAt.toLocaleString()}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/api/requirements/${requirement.id}`}>Open</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

