import { Badge } from "@trustfirst/ui";
import { Building2, LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  mode: "admin" | "client";
};

const nav = {
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/client", label: "Client view", icon: UsersRound },
  ],
  client: [
    { href: "/client", label: "Overview", icon: LayoutDashboard },
    { href: "/admin", label: "Admin view", icon: Building2 },
  ],
};

export function AppShell({ children, mode }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-x-0 top-0 z-10 border-b border-border bg-background/95 backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center justify-between px-4 md:h-auto md:flex-col md:items-start md:gap-8 md:p-6">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <ShieldCheck className="size-6 text-primary" />
            TrustFirst
          </Link>
          <Badge>{mode}</Badge>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-4">
          {nav[mode].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="px-4 pb-10 pt-24 sm:px-6 md:ml-64 md:pt-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
