import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function ManglamRequirementIntakeThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const params = await searchParams;
  const submissionNumber = params.submission ?? "submitted";

  return (
    <main className="flex min-h-screen items-center bg-muted/30 px-4 py-8">
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <Badge>Submission received</Badge>
          <CardTitle className="mt-3 flex items-center gap-2 text-2xl">
            <CheckCircle2 className="size-7 text-emerald-600" />
            Thank you
          </CardTitle>
          <CardDescription>
            Your requirement intake has been saved for TrustFirst admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">Submission number</p>
            <p className="mt-1 font-mono text-lg font-semibold">{submissionNumber}</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            This public page cannot view submitted details. The TrustFirst team will review the intake inside the protected admin workspace.
          </p>
          <Button asChild variant="outline">
            <Link href="/intake/manglam-trading-demo">Submit another requirement</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
