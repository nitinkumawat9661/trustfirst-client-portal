import type { Metadata } from "next";
import { ManglamPublicIntakeServerForm } from "@/features/intake/manglam-public-intake-server-form";
import { manglamTradingConfiguration } from "@/server/config-packs/manglam-profile";

export const metadata: Metadata = {
  title: "Mangalam Sanitary Requirement Intake",
  description: "Public requirement intake for Mangalam Sanitary.",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function ManglamRequirementIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">TrustFirst Client Portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            {manglamTradingConfiguration.firmName} Software Requirement Form
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Please complete the public intake below. The submission goes directly to the protected TrustFirst admin intake queue.
          </p>
        </div>
        {error ? (
          <div className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            Submission failed. Please retry or send details on WhatsApp.
          </div>
        ) : null}
        <ManglamPublicIntakeServerForm />
      </div>
    </main>
  );
}
