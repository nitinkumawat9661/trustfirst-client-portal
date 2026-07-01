import { Badge, Button, Card, CardContent } from "@trustfirst/ui";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <ShieldCheck className="size-6 text-primary" />
            TrustFirst Client Portal
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <Link href="/admin">Admin</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-20">
        <div className="flex flex-col justify-center">
          <Badge className="mb-5 w-fit">
            <LockKeyhole className="mr-1 size-3" />
            Secure SaaS foundation
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            TrustFirst Client Portal
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A mobile-first client collaboration platform foundation for teams
            that need secure access, role-aware workspaces, and a clean path to
            enterprise modules.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-in">
                Open portal
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/client">View client shell</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-border bg-muted px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="size-4 text-primary" />
                Portal readiness
              </div>
            </div>
            <div className="space-y-4 p-5">
              {[
                "Auth.js session foundation",
                "Prisma PostgreSQL data layer",
                "Admin and client route shells",
                "Shared Tailwind UI primitives",
              ].map((item) => (
                <div className="flex items-center gap-3" key={item}>
                  <CheckCircle2 className="size-5 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
