import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getPrisma } from "@trustfirst/database";
import { PublicIntakeReceiptDraftCleanup } from "@/features/intake/public-intake-submit-guard";
import { ManglamPublicIntakeService } from "@/server/intake/manglam-public-intake-service";

export const dynamic = "force-dynamic";

export default async function ManglamRequirementIntakeThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const params = await searchParams;
  const submissionNumber = params.submission ?? "";
  const receipt = submissionNumber
    ? await new ManglamPublicIntakeService(getPrisma()).getReceiptBySubmissionNumber(submissionNumber)
    : null;

  if (!receipt) {
    return (
      <main className="flex min-h-screen items-center bg-muted/30 px-4 py-8">
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <Badge>Submission not confirmed</Badge>
            <CardTitle className="mt-3 text-2xl">Submission failed</CardTitle>
            <CardDescription>
              Submission failed. Please retry or send details on WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              A confirmation page is shown only after Mangalam Sanitary ERP saves your requirement in the database.
            </p>
            <Button asChild>
              <Link href="/intake/manglam-trading-demo?error=submit">Retry intake form</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center bg-muted/30 px-4 py-8">
      <PublicIntakeReceiptDraftCleanup />
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <Badge>Submission received</Badge>
          <CardTitle className="mt-3 flex items-center gap-2 text-2xl">
            <CheckCircle2 className="size-7 text-emerald-600" />
            Thank you
          </CardTitle>
          <CardDescription>
            Your details have been received by Mangalam Sanitary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">Submission ID</p>
            <p className="mt-1 font-mono text-lg font-semibold">{receipt.submissionNumber}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="mt-1 text-sm font-semibold">{formatReceiptDate(receipt.submittedAt)}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Business name</p>
              <p className="mt-1 text-sm font-semibold">{receipt.businessName}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Please send this Submission ID to Mangalam Sanitary on WhatsApp.
          </p>
          {receipt.possibleDuplicate ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This looks similar to a recent submission. Mangalam Sanitary will verify the latest details in the ERP queue.
            </p>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/intake/manglam-trading-demo">Submit another requirement</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function formatReceiptDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}
