import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { requireCurrentUser } from "@/server/auth/session";
import { releaseReadinessChecklist } from "@/server/release/release-readiness";

export const dynamic = "force-dynamic";

export default async function ReleaseChecklistPage() {
  const user = await requireCurrentUser();
  const checklist = await releaseReadinessChecklist({
    activeUserId: user.id,
    prisma: getPrisma(),
    tenantId: user.activeTenantId ?? "public",
  });

  return (
    <div className="space-y-6">
      <div>
        <Badge>Release package</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Preview release checklist</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Deployment readiness for Vercel preview and later VPS production.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Release gate</CardTitle>
            <Badge>{checklist.ready ? "Ready" : "Needs attention"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {checklist.items.map((item) => (
            <div className="flex items-start gap-3 rounded-md border border-border p-4" key={item.key}>
              {item.ready ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 text-primary" />
              ) : (
                <CircleAlert aria-hidden className="mt-0.5 size-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
