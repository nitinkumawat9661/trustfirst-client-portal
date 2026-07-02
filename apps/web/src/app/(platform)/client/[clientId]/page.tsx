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
  CheckCircle2,
  FileText,
  FolderKanban,
  HeartPulse,
  ListChecks,
  MessageSquare,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/session";
import { ClientService } from "@/server/crm";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

const tabs = [
  "overview",
  "projects",
  "requirements",
  "files",
  "approvals",
  "timeline",
  "notes",
  "contacts",
  "settings",
] as const;

export default async function ClientWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ clientId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireCurrentUser(),
  ]);
  const activeTab = tabs.includes(query.tab as (typeof tabs)[number])
    ? (query.tab as (typeof tabs)[number])
    : "overview";
  const service = new ClientService(getPrisma());

  let workspace;
  try {
    workspace = await service.getWorkspace(
      { tenantId: user.activeTenantId ?? "public", userId: user.id },
      clientId,
    );
  } catch {
    notFound();
  }

  const metricCards = [
    { icon: FolderKanban, label: "Active Projects", value: workspace.metrics.activeProjects },
    { icon: CheckCircle2, label: "Pending Approvals", value: workspace.metrics.pendingApprovals },
    { icon: FileText, label: "Pending Requirements", value: workspace.metrics.pendingRequirements },
    { icon: ListChecks, label: "Open Tasks", value: workspace.metrics.openTasks },
    { icon: Upload, label: "Recent Files", value: workspace.metrics.recentFiles },
    { icon: HeartPulse, label: "Health Score", value: `${workspace.metrics.healthScore}%` },
  ];

  return (
    <AppShell mode="client">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{workspace.client.lifecycleStage.toLowerCase()}</Badge>
          <Badge>{workspace.client.status.toLowerCase()}</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{workspace.client.name}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {workspace.client.industry ?? "General account"} ·{" "}
          {workspace.client.primaryContact?.email ?? "No primary contact"}
        </p>
      </div>

      <nav aria-label="Client workspace sections" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2">
        {tabs.map((tab) => (
          <Link
            aria-current={activeTab === tab ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-sm capitalize ${
              activeTab === tab
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
            href={`/client/${clientId}?tab=${tab}`}
            key={tab}
          >
            {tab}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
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
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
        <WorkspacePanel activeTab={activeTab} workspace={workspace} />
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Every client action is captured in timeline order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.activity.length === 0 ? (
              <EmptyState label="No activity has been recorded yet." />
            ) : (
              workspace.activity.map((event) => (
                <div className="rounded-md border border-border p-3" key={event.id}>
                  <p className="text-sm font-medium">{event.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.verb.toLowerCase()} · {event.occurredAt.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function WorkspacePanel({
  activeTab,
  workspace,
}: {
  activeTab: (typeof tabs)[number];
  workspace: Awaited<ReturnType<ClientService["getWorkspace"]>>;
}) {
  if (activeTab === "contacts") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Primary contacts, roles, invitations, and activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.contacts.length === 0 ? (
            <EmptyState label="No contacts have been added." />
          ) : (
            workspace.contacts.map((contact) => (
              <div className="flex items-center gap-3 rounded-md border border-border p-3" key={contact.id}>
                <Users aria-hidden className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.email} · {contact.role ?? "Contact"}
                    {contact.isPrimary ? " · Primary" : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "notes" || activeTab === "settings") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{activeTab === "notes" ? "Notes" : "Settings"}</CardTitle>
          <CardDescription>
            {activeTab === "notes"
              ? "Internal and client-visible account notes."
              : "Lifecycle, tags, metadata, custom fields, archive, and soft delete controls."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTab === "notes" && workspace.notes.length > 0 ? (
            workspace.notes.map((note) => (
              <div className="rounded-md border border-border p-3" key={note.id}>
                <p className="font-medium">{note.title ?? "Untitled note"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{note.body}</p>
              </div>
            ))
          ) : (
            <EmptyState label={activeTab === "notes" ? "No notes yet." : "Settings are API-managed in this foundation."} />
          )}
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "timeline") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Created, updated, commented, uploaded, approved, and status changed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.activity.map((event) => (
            <div className="rounded-md border border-border p-3" key={event.id}>
              <p className="font-medium">{event.summary}</p>
              <p className="text-sm text-muted-foreground">{event.occurredAt.toLocaleString()}</p>
            </div>
          ))}
          {workspace.activity.length === 0 ? <EmptyState label="No timeline entries yet." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (activeTab === "approvals" || activeTab === "files" || activeTab === "projects" || activeTab === "requirements") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{activeTab}</CardTitle>
          <CardDescription>Workspace-ready surface backed by tenant-aware CRM counters.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState label={`${activeTab} records will appear here as modules attach to the CRM workspace.`} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Account manager, ownership, tags, comments, and health.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Info label="Legal name" value={workspace.client.legalName ?? "Not set"} />
        <Info label="Website" value={workspace.client.website ?? "Not set"} />
        <Info label="Source" value={workspace.client.source ?? "Not set"} />
        <Info label="Tags" value={workspace.client.tags.join(", ") || "No tags"} />
        <div className="sm:col-span-2">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden className="size-4 text-muted-foreground" />
              <p className="font-medium">Threaded comments</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace.comments.length} active or resolved comment threads.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
