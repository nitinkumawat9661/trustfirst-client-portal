import { getPrisma } from "@trustfirst/database";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/server/auth/session";
import {
  ManglamPublicIntakeService,
  PUBLIC_INTAKE_SOURCE,
} from "@/server/intake/manglam-public-intake-service";
import type { ManglamPublicIntakeInput } from "@/features/intake/manglam-intake-schema";

export const dynamic = "force-dynamic";

export default async function AdminRequirementIntakePage() {
  const user = await requireCurrentUser();
  const tenantId = user.activeTenantId ?? "public";
  const service = new ManglamPublicIntakeService(getPrisma());
  const submissions = await service.listQueue(tenantId);

  async function markReviewedAction(formData: FormData) {
    "use server";

    const currentUser = await requireCurrentUser();
    const requirementId = String(formData.get("requirementId") ?? "");
    const actionService = new ManglamPublicIntakeService(getPrisma());
    await actionService.markReviewed(currentUser.activeTenantId ?? "public", requirementId, currentUser.id);
    revalidatePath("/admin/requirements/intake");
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge>{PUBLIC_INTAKE_SOURCE}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">Public requirement intake</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Protected admin queue for write-only public intake submissions from the Manglam demo link.
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No public intake submissions yet</CardTitle>
            <CardDescription>New public submissions will appear here after the intake form is submitted.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => {
            return (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>{submission.title}</CardTitle>
                      <CardDescription>
                        {submission.submissionNumber} · {formatAdminDate(submission.submittedAt ?? submission.createdAt)} · {submission.businessName}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{submission.status}</Badge>
                      <Badge>{submission.priority}</Badge>
                      <Badge>{submission.source}</Badge>
                      <Badge>{submission.clientSlug}</Badge>
                      <Badge>{submission.reviewed ? "Reviewed" : "New Requirement Submitted"}</Badge>
                      {submission.possibleDuplicate ? <Badge>Possible duplicate</Badge> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <IntakeSubmissionDetails requirementId={submission.id} tenantId={tenantId} />
                  {submission.reviewed ? null : (
                    <form action={markReviewedAction}>
                      <input name="requirementId" type="hidden" value={submission.id} />
                      <Button type="submit" variant="outline">Mark reviewed</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function IntakeSubmissionDetails({
  requirementId,
  tenantId,
}: {
  requirementId: string;
  tenantId: string;
}) {
  const service = new ManglamPublicIntakeService(getPrisma());
  const record = await service.getQueueItem(tenantId, requirementId);
  const data = record?.submittedData as ManglamPublicIntakeInput | null;

  if (!record || !data) {
    return <p className="text-sm text-muted-foreground">Submission details are not available.</p>;
  }

  const groups = [
    ["Submission ID", String((record.metadata as Record<string, unknown>).submissionNumber ?? record.id)],
    ["Submitted time", record.submittedAt ? formatAdminDate(record.submittedAt) : "Not submitted"],
    ["Business name", data.company.firmName],
    ["Owner/mobile summary", [data.company.contactName, data.company.phone, data.company.email].filter(Boolean).join(" · ")],
    ["Status", record.status],
    ["Source", String((record.metadata as Record<string, unknown>).source ?? PUBLIC_INTAKE_SOURCE)],
    ["Client slug", record.client?.slug ?? "manglam-trading-demo"],
    ["Business", [data.business.businessType, data.business.address, data.business.teamSize].filter(Boolean).join(" · ")],
    ["Catalog", [...data.catalog.productCategories, ...data.catalog.unitTypes].join(", ")],
    ["Inventory", [data.inventory.godowns, data.inventory.stockTracking, data.inventory.lowStockAlerts].filter(Boolean).join(" · ")],
    ["Sales", [data.sales.quotationFlow, data.sales.billingFlow, data.sales.printFormat].filter(Boolean).join(" · ")],
    ["Purchase", [data.purchase.supplierManagement, data.purchase.purchaseEntryNeeds].filter(Boolean).join(" · ")],
    ["Payments", [data.payments.paymentModes.join(", "), data.payments.outstandingTracking].filter(Boolean).join(" · ")],
    ["Reports", [data.reports.requiredReports.join(", "), data.reports.dashboardNeeds].filter(Boolean).join(" · ")],
    ["Access", [data.access.rolesNeeded.join(", "), data.access.languagePreference, data.access.offlineNeed].filter(Boolean).join(" · ")],
    ["Success criteria", data.notes.successCriteria],
  ];

  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {groups.map(([label, value]) => (
        <div className="rounded-md border border-border bg-background px-3 py-2" key={label}>
          <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm leading-6">{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatAdminDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}
