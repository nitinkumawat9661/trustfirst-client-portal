import type { Metadata } from "next";
import { ManglamPublicIntakeServerForm } from "@/features/intake/manglam-public-intake-server-form";

export const metadata: Metadata = {
  title: "Manglam Requirement Intake",
  description: "Public requirement intake for the Manglam Trading hardware ERP demo.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function ManglamRequirementIntakePage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">TrustFirst Client Portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            Manglam Trading Company Software Requirement Form
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Please complete the public intake below. The submission goes directly to the protected TrustFirst admin intake queue.
          </p>
        </div>
        <ManglamPublicIntakeServerForm />
      </div>
    </main>
  );
}
