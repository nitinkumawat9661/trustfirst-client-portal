import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/admin");
  const { callbackUrl } = await searchParams;

  return (
    <main className="grid min-h-screen bg-[#171717] lg:grid-cols-[minmax(340px,0.85fr)_minmax(500px,1.15fr)]">
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-4 text-white">
            <div className="flex size-16 items-center justify-center rounded-md bg-white p-1.5">
              <Image alt="Mangalam Sanitary approved logo" className="size-full object-contain" height={64} priority src="/api/public/branding/mangalam-sanitary-logo" unoptimized width={64} />
            </div>
            <div>
              <p className="font-semibold">MANGALAM SANITARY</p>
              <p className="mt-1 text-xs text-[#d6aa58]">BATHWARE · PLUMBING · HARDWARE</p>
            </div>
          </div>
          <Card className="border-zinc-700 bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
            <CardHeader>
              <CardTitle>Sign in to your workspace</CardTitle>
              <CardDescription>Use the account issued by your business administrator.</CardDescription>
            </CardHeader>
            <CardContent><SignInForm callbackUrl={safeCallback(callbackUrl)} /></CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-zinc-400">Secure tenant workspace · Powered by TrustFirst</p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden border-l border-white/10 bg-[#202020] lg:flex lg:items-end">
        <Image alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-25 grayscale" fill priority src="/api/public/branding/mangalam-sanitary-logo" unoptimized />
        <div className="relative z-10 w-full border-t border-white/10 bg-black/60 p-10 text-white">
          <p className="text-sm font-medium text-[#d6aa58]">Mangalam Sanitary ERP</p>
          <h1 className="mt-3 max-w-xl text-3xl font-semibold">Products, stock, purchasing, billing, and ledgers in one secure workspace.</h1>
        </div>
      </section>
    </main>
  );
}

function safeCallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}
