import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@trustfirst/ui";
import {
  BriefcaseBusiness,
  FileCheck2,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { SignInForm } from "@/features/auth/sign-in-form";
import {
  CANONICAL_ORIGINS,
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export const metadata = {
  title: "Sign in",
};

const trustFirstTheme = {
  "--primary": "#2563eb",
  "--primary-foreground": "#ffffff",
  "--ring": "#60a5fa",
  "--border": "#dbeafe",
  "--input": "#cbd5e1",
} as CSSProperties;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const requestHeaders = await headers();
  const host = readEffectiveHost(requestHeaders);
  const surface = resolveAppSurfaceFromHost(host);
  const { callbackUrl } = await searchParams;

  if (surface === "MANGALAM_PUBLIC") {
    redirect(`${CANONICAL_ORIGINS.mangalamErp}/sign-in`);
  }

  const defaultDestination =
    surface === "TRUSTFIRST_PORTAL" ? "/client" : "/admin";

  const session = await auth();

  if (session?.user?.id) {
    redirect(defaultDestination);
  }

  const safeDestination = safeCallback(
    callbackUrl,
    defaultDestination,
  );

  const portalLabel =
    surface === "MANGALAM_ERP"
      ? "SECURE ERP ACCESS"
      : "CLIENT PORTAL";

  return (
    <TrustFirstSignIn
      callbackUrl={safeDestination}
      portalLabel={portalLabel}
    />
  );
}

function TrustFirstSignIn({
  callbackUrl,
  portalLabel,
}: {
  callbackUrl: string;
  portalLabel: string;
}) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#07111f] text-white"
      style={trustFirstTheme}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.25),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.17),transparent_32%)]"
      />

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(380px,0.85fr)_minmax(560px,1.15fr)]">
        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl border border-blue-300/30 bg-blue-500/15 text-lg font-bold tracking-tight text-blue-100 shadow-[0_0_45px_rgba(37,99,235,0.22)]">
                TF
              </div>

              <div>
                <p className="font-semibold tracking-[0.08em] text-white">
                  TRUSTFIRST SOLUTIONS
                </p>
                <p className="mt-1 text-xs font-medium tracking-[0.16em] text-blue-300">
                  {portalLabel}
                </p>
              </div>
            </div>

            <Card className="border-white/10 bg-white text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
              <CardHeader className="space-y-3">
                <div className="mb-1 grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <ShieldCheck className="size-5" />
                </div>

                <CardTitle className="text-2xl">
                  Welcome back
                </CardTitle>

                <CardDescription className="leading-6">
                  Sign in to securely access your projects,
                  documents, approvals, requirements, and billing.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <SignInForm callbackUrl={callbackUrl} />
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-400">
              Secure client workspace Ã‚Â· Powered by TrustFirst Solutions
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden border-l border-white/10 lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(5,12,25,0.96)),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.35),transparent_36%)]"
          />

          <div
            aria-hidden
            className="absolute -right-32 top-12 size-[32rem] rounded-full border border-blue-400/10"
          />
          <div
            aria-hidden
            className="absolute -right-12 top-32 size-[22rem] rounded-full border border-blue-300/10"
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3 text-sm text-blue-200">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
              Secure production workspace
            </div>

            <div className="max-w-2xl py-14">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                TrustFirst Secure Workspace
              </p>

              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                One secure place for every authorised workspace.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
                Access projects, documents, approvals,
                requirements, billing, and business operations
                through one protected workspace.
              </p>

              <div className="mt-10 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <FolderKanban className="size-6 text-blue-300" />
                  <p className="mt-4 font-medium">Projects</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Track milestones, tasks, and delivery.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <FileCheck2 className="size-6 text-cyan-300" />
                  <p className="mt-4 font-medium">Documents</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Review files, approvals, and records.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <BriefcaseBusiness className="size-6 text-indigo-300" />
                  <p className="mt-4 font-medium">Workspace</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Manage requirements and billing securely.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs tracking-wide text-slate-500">
              Role-based access Ã‚Â· Secure sessions Ã‚Â· Controlled client visibility
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function safeCallback(
  value: string | undefined,
  fallback: string,
) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
