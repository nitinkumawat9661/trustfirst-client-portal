import { getPrisma } from "@trustfirst/database";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@trustfirst/ui";
import {
  Activity,
  CalendarDays,
  FileStack,
  Flag,
  FolderKanban,
  Gauge,
  ListChecks,
  Users,
} from "lucide-react";
import { requireCurrentUser } from "@/server/auth/session";
import { ProjectService } from "@/server/projects";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function ProjectsDashboardPage() {
  const user = await requireCurrentUser();
  const service = new ProjectService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [projects, dashboard] = await Promise.all([
    service.list(context),
    service.dashboard(context),
  ]);
  const cards = [
    { icon: Gauge, label: "Progress", value: `${dashboard.progress}%` },
    { icon: Flag, label: "Milestones", value: dashboard.milestones },
    { icon: ListChecks, label: "Tasks", value: dashboard.tasks },
    { icon: CalendarDays, label: "Overdue", value: dashboard.overdue },
    { icon: CalendarDays, label: "Upcoming", value: dashboard.upcoming },
    { icon: Activity, label: "Activity", value: dashboard.activity },
    { icon: FileStack, label: "Files", value: dashboard.files },
    { icon: Users, label: "Team", value: dashboard.team },
  ];

  return (
    <AppShell mode="client">
      <div className="mb-6">
        <Badge>Project Engine</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Project dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tenant-aware project execution with lifecycle rules, milestones, tasks,
          deliverables, timeline, calendar, and Gantt-ready contracts.
        </p>
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
          <CardTitle>Projects</CardTitle>
          <CardDescription>Planning, active, blocked, review, completed, and archived work.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
              No projects are available for this tenant yet.
            </div>
          ) : (
            projects.map((project) => (
              <div
                className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={project.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FolderKanban aria-hidden className="size-4 text-muted-foreground" />
                    <p className="font-medium">{project.name}</p>
                    <Badge>{project.status.toLowerCase()}</Badge>
                    <Badge>{project.priority.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Progress {project.progress}% · Target{" "}
                    {project.targetDate?.toLocaleDateString() ?? "not set"}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

