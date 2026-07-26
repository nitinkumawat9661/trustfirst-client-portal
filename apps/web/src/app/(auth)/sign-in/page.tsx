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
  PackageCheck,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { SignInForm } from "@/features/auth/sign-in-form";
import {
  CANONICAL_ORIGINS,
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";
import {
  defaultSignInDestination,
  safeSignInCallback,
  signInBrandForSurface,
} from "@/server/domain/sign-in-surface";

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
const mangalamTheme = {
  "--primary": "#c99a45",
  "--primary-foreground": "#111111",
  "--ring": "#d6aa57",
  "--border": "#3f3426",
  "--input": "#3a332b",
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

  const defaultDestination = defaultSignInDestination(surface);

  const session = await auth();

  if (session?.user?.id) {
    redirect(defaultDestination);
  }

  const safeDestination = safeSignInCallback(
    callbackUrl,
    defaultDestination,
  );

  if (signInBrandForSurface(surface) === "MANGALAM") {
    return <MangalamSignIn callbackUrl={safeDestination} />;
  }

  return (
    <TrustFirstSignIn
      callbackUrl={safeDestination}
      portalLabel="CLIENT PORTAL"
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
              Secure client workspace · Powered by TrustFirst Solutions
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
              Role-based access · Secure sessions · Controlled client visibility
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MangalamSignIn({ callbackUrl }: { callbackUrl: string }) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#0f0f0f] text-white"
      style={mangalamTheme}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(201,154,69,0.22),transparent_34%),linear-gradient(135deg,#0b0b0b,#181511_52%,#080808)]"
      />

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(380px,0.9fr)_minmax(560px,1.1fr)]">
        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-full border border-[#d2a24c]/45 bg-white p-1 shadow-[0_0_42px_rgba(210,162,76,0.2)]">
                <Image
                  alt="Mangalam Sanitary approved logo"
                  className="size-full rounded-full object-contain"
                  height={64}
                  src="/api/public/branding/mangalam-sanitary-logo"
                  unoptimized
                  width={64}
                />
              </div>

              <div>
                <p className="font-semibold tracking-[0.16em] text-white">
                  MANGALAM SANITARY
                </p>
                <p className="mt-1 text-xs font-medium tracking-[0.18em] text-[#d2a24c]">
                  BATHWARE · PLUMBING · HARDWARE
                </p>
              </div>
            </div>

            <Card className="border-[#d2a24c]/20 bg-[#fbfaf7] text-[#141414] shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
              <CardHeader className="space-y-3">
                <div className="mb-1 grid size-11 place-items-center rounded-xl bg-[#171717] text-[#d2a24c]">
                  <ShieldCheck className="size-5" />
                </div>

                <CardTitle className="text-2xl">
                  Mangalam Sanitary ERP
                </CardTitle>

                <CardDescription className="leading-6 text-zinc-700">
                  Sign in to manage products, stock, purchasing,
                  billing, payments, and customer/supplier ledgers.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <SignInForm callbackUrl={callbackUrl} />
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-zinc-400">
              Secure ERP workspace · Powered by TrustFirst Solutions
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden border-l border-[#d2a24c]/15 lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(145deg,rgba(15,15,15,0.82),rgba(5,5,5,0.98)),radial-gradient(circle_at_70%_20%,rgba(210,162,76,0.22),transparent_34%)]"
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3 text-sm text-[#f0d79b]">
              <span className="size-2 rounded-full bg-[#d2a24c] shadow-[0_0_16px_rgba(210,162,76,0.8)]" />
              Secure Mangalam ERP access
            </div>

            <div className="max-w-2xl py-14">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d2a24c]">
                Mangalam Sanitary ERP
              </p>

              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                Daily shop operations in one protected workspace.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-zinc-300">
                Manage product master, stock movement, purchasing,
                billing, payments, and ledgers with role-based access.
              </p>

              <div className="mt-10 grid gap-4 xl:grid-cols-3">
                <MangalamFeature
                  icon={PackageCheck}
                  title="Products"
                  text="Search, bill, and keep master data clean."
                />
                <MangalamFeature
                  icon={Warehouse}
                  title="Stock"
                  text="Protect inventory while handling daily sales."
                />
                <MangalamFeature
                  icon={BriefcaseBusiness}
                  title="Ledgers"
                  text="Track purchasing, billing, and balances."
                />
              </div>
            </div>

            <p className="text-xs tracking-wide text-zinc-500">
              Black/gold ERP access · Secure sessions · Tenant protected
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MangalamFeature({
  icon: Icon,
  text,
  title,
}: {
  icon: typeof PackageCheck;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d2a24c]/15 bg-white/[0.05] p-5 backdrop-blur">
      <Icon className="size-6 text-[#d2a24c]" />
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {text}
      </p>
    </div>
  );
}
