import { Button, Card, CardContent } from "@trustfirst/ui";
import {
  ArrowRight,
  Bath,
  Building2,
  Droplets,
  FileSearch,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { manglamTradingConfiguration } from "@/server/config-packs/manglam-profile";
import { CANONICAL_ORIGINS } from "@/server/domain/host-routing";

const categories = [
  {
    icon: Bath,
    title: "Sanitary Ware",
    description: "Bathroom sanitary solutions and related fittings.",
  },
  {
    icon: Droplets,
    title: "Bathware",
    description: "Bath fittings, taps, faucets and bathroom accessories.",
  },
  {
    icon: Wrench,
    title: "Plumbing",
    description: "Pipes, fittings, valves and plumbing essentials.",
  },
  {
    icon: Building2,
    title: "Hardware",
    description: "Practical hardware products for construction and maintenance.",
  },
] as const;

export function MangalamPublicHome() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] text-zinc-950">
      <header className="border-b border-black/10 bg-[#151515] text-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-1">
              <Image
                alt="Mangalam Sanitary logo"
                className="size-full object-contain"
                height={56}
                priority
                src="/api/public/branding/mangalam-sanitary-logo"
                unoptimized
                width={56}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] sm:text-base">
                MANGALAM SANITARY
              </p>
              <p className="mt-1 text-[10px] tracking-[0.14em] text-[#d6aa58] sm:text-xs">
                BATHWARE &bull; PLUMBING &bull; HARDWARE
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              asChild
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              variant="outline"
            >
              <Link href={`${CANONICAL_ORIGINS.mangalamErp}/sign-in`}>
                ERP Login
              </Link>
            </Button>
            <Button
              asChild
              className="bg-[#c69a49] text-black hover:bg-[#d8ae61]"
            >
              <Link href="/receipt">
                Check Bill / Receipt
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#191919] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(198,154,73,0.20),transparent_38%)]" />

        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d6aa58]">
              Sikar, Rajasthan
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Complete solutions for bathware, plumbing and hardware.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              {manglamTradingConfiguration.firmName} serves customers with
              sanitary, bathware, plumbing and hardware requirements from its
              Sikar business location.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="bg-[#c69a49] text-black hover:bg-[#d8ae61]"
                size="lg"
              >
                <Link href="/receipt">
                  <FileSearch className="size-5" />
                  View Bill / Receipt
                </Link>
              </Button>

              <Button
                asChild
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
                size="lg"
                variant="outline"
              >
                <Link href={`${CANONICAL_ORIGINS.mangalamErp}/sign-in`}>ERP Login</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
            <div className="absolute size-72 rounded-full bg-[#c69a49]/10 blur-3xl" />
            <div className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10">
              <Image
                alt="Mangalam Sanitary"
                className="size-full object-contain"
                height={380}
                priority
                src="/api/public/branding/mangalam-sanitary-logo"
                unoptimized
                width={380}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        id="categories"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6b20]">
            Product Categories
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Built around everyday construction and bathroom needs.
          </h2>
          <p className="mt-4 leading-7 text-zinc-600">
            Categories shown here describe the business scope only. Product
            availability and pricing are confirmed at the store.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Card className="border-black/10 bg-white shadow-none" key={category.title}>
                <CardContent className="p-6">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-[#191919] text-[#d6aa58]">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{category.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#191919] text-[#d6aa58]">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Registered business identity</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              GSTIN: {manglamTradingConfiguration.gstin}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Proprietor: {manglamTradingConfiguration.proprietorName}
            </p>
          </div>

          <div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#191919] text-[#d6aa58]">
              <MapPin className="size-5" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Visit Mangalam Sanitary</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
              {manglamTradingConfiguration.addressDisplay}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#151515] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold text-[#d6aa58]">
              Customer Bill & Receipt Service
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Need to view your invoice or payment receipt?
            </h2>
          </div>

          <Button
            asChild
            className="bg-[#c69a49] text-black hover:bg-[#d8ae61]"
            size="lg"
          >
            <Link href="/receipt">
              Check Bill / Receipt
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#101010] text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} MANGALAM SANITARY</p>
          <p>BATHWARE &bull; PLUMBING &bull; HARDWARE</p>
        </div>
      </footer>
    </main>
  );
}
