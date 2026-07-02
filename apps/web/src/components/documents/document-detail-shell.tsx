import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2, Clock, FileClock, FileText, MessageSquare, Paperclip } from "lucide-react";
import type { CommercialDocumentWorkspace } from "@/server/commercial-documents";

export function DocumentDetailShell({ document }: { document: CommercialDocumentWorkspace }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>{document.status.toLowerCase().replaceAll("_", " ")}</Badge>
          <h1 className="mt-4 text-3xl font-semibold">{document.title}</h1>
          <p className="mt-2 text-muted-foreground">{document.documentNumber} · v{document.currentVersion}</p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
          Template {document.templateKey}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Document detail</CardTitle>
            <CardDescription>{document.summary ?? "No summary has been added yet."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Type" value={document.type.toLowerCase().replaceAll("_", " ")} />
            <Info label="Client" value={document.clientId ?? "Not linked"} />
            <Info label="Project" value={document.projectId ?? "Not linked"} />
            <Info label="Requirement" value={document.requirementId ?? "Not linked"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval panel</CardTitle>
            <CardDescription>Server-side transitions protect approve and reject actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock aria-hidden className="size-4 text-muted-foreground" />
              Current state: {document.status}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-4 text-muted-foreground" />
              Approval events are recorded in timeline
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          empty="No versions yet."
          icon={FileClock}
          items={document.versions.map((version) => `v${version.version} · ${version.createdAt.toLocaleDateString()}`)}
          title="Version history"
        />
        <Panel
          empty="No comments yet."
          icon={MessageSquare}
          items={document.comments.map((comment) => comment.body)}
          title="Comments"
        />
        <Panel
          empty="No attachments yet."
          icon={Paperclip}
          items={document.attachments.map((attachment) => attachment.name)}
          title="Attachments"
        />
      </div>

      <Panel
        empty="No timeline events yet."
        icon={FileText}
        items={document.timeline.map((event) => `${event.summary} · ${event.occurredAt.toLocaleString()}`)}
        title="Timeline"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}

function Panel({
  empty,
  icon: Icon,
  items,
  title,
}: {
  empty: string;
  icon: typeof FileText;
  items: string[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {empty}
          </div>
        ) : (
          items.map((item, index) => (
            <div className="rounded-md border border-border p-3 text-sm" key={`${item}-${index}`}>
              {item}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
