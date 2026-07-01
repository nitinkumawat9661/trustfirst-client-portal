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
  Bell,
  ClipboardList,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

const dashboardCards = [
  {
    title: "Workspace health",
    description: "Static operational summary placeholder.",
    icon: Activity,
  },
  {
    title: "Approvals",
    description: "Future review and approval queue entry point.",
    icon: ClipboardList,
  },
  {
    title: "Notifications",
    description: "Future alert and reminder stream.",
    icon: Bell,
  },
  {
    title: "Search",
    description: "Global search UI is available from the top navigation.",
    icon: Search,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>Admin dashboard</Badge>
          <h1 className="mt-4 text-3xl font-semibold">Command center</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Static dashboard foundation for tenant operations, access, search,
            notifications, and settings workflows.
          </p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
          No APIs connected
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title}>
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 rounded-full bg-muted" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Placeholder state
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <AdminEmptyState
          description="Client, project, and service-line modules are intentionally not connected in this foundation."
          icon={LayoutDashboard}
          title="Dashboard modules are waiting for business domains"
        />
        <AdminEmptyState
          actionLabel="Open settings shell"
          actionHref="/admin/settings"
          description="Use the settings shell to establish future tenant configuration patterns."
          icon={Settings}
          title="Settings shell is ready"
        />
      </div>
    </div>
  );
}
