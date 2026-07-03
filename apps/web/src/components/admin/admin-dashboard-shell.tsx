"use client";

import { Badge, Button, Input, cn } from "@trustfirst/ui";
import {
  Bell,
  ChevronDown,
  Command,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { adminNavigation, adminQuickActions } from "./admin-navigation";
import { OfflineSyncPanel } from "@/components/offline/offline-sync-panel";
import type { OfflineQueueScope } from "@/lib/offline-queue";

type AdminDashboardShellProps = {
  children: ReactNode;
  offlineScope: OfflineQueueScope;
  stagingAuthBypass?: boolean;
};

export function AdminDashboardShell({ children, offlineScope, stagingAuthBypass = false }: AdminDashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("trustfirst.theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    window.setTimeout(() => setTheme(initialTheme), 0);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("trustfirst.theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
            <Button
              aria-label="Open navigation"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <AdminBreadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Button
              aria-label="Open global search"
              className="md:hidden"
              onClick={() => setCommandOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Search className="size-5" />
            </Button>
            <GlobalSearch onOpenCommand={() => setCommandOpen(true)} />
            <Button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              size="sm"
              type="button"
              variant="ghost"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <NotificationBell
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
            />
            <UserMenu open={userMenuOpen} onOpenChange={setUserMenuOpen} />
          </div>
        </header>
        {stagingAuthBypass ? (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 sm:px-6 lg:px-8" role="status">
            HTTP staging auth bypass is enabled. This is for staging QA only. Do not use for production clients.
          </div>
        ) : null}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <OfflineSyncPanel scope={offlineScope} />
    </div>
  );
}

function AdminSidebar({
  mobileOpen,
  onClose,
  pathname,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-background transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-border px-4">
          <Link className="flex items-center gap-2 font-semibold" href="/admin">
            <ShieldCheck className="size-6 text-primary" />
            TrustFirst Admin
          </Link>
          <Button
            aria-label="Close navigation"
            className="lg:hidden"
            onClick={onClose}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Badge className="mb-4">Foundation</Badge>
          <nav aria-label="Admin navigation" className="space-y-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={onClose}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs opacity-80">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          Admin dashboard UI foundation only. No connected modules.
        </div>
      </aside>
    </>
  );
}

function AdminBreadcrumbs({ breadcrumbs }: { breadcrumbs: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li className="flex min-w-0 items-center gap-2" key={crumb.href}>
            {index > 0 ? <span className="text-muted-foreground">/</span> : null}
            {index === breadcrumbs.length - 1 ? (
              <span className="truncate font-medium">{crumb.label}</span>
            ) : (
              <Link className="truncate text-muted-foreground hover:text-foreground" href={crumb.href}>
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function GlobalSearch({ onOpenCommand }: { onOpenCommand: () => void }) {
  return (
    <button
      className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
      onClick={onOpenCommand}
      type="button"
    >
      <Search className="size-4" />
      <span className="flex-1">Search admin workspace</span>
      <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">
        Ctrl K
      </kbd>
    </button>
  );
}

function NotificationBell({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="relative">
      <Button
        aria-expanded={open}
        aria-label="Notifications"
        onClick={() => onOpenChange(!open)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <span className="relative">
          <Bell className="size-5" />
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" />
        </span>
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-card p-3 shadow-lg">
          <p className="font-medium">Notifications</p>
          <div className="mt-3 space-y-2">
            {["Approval queue placeholder", "System status placeholder"].map((item) => (
              <div className="rounded-md border border-border p-3 text-sm" key={item}>
                <p>{item}</p>
                <p className="mt-1 text-xs text-muted-foreground">UI state only</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="relative">
      <Button
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => onOpenChange(!open)}
        size="sm"
        type="button"
        variant="outline"
      >
        <UserRound className="size-4" />
        <span className="hidden sm:inline">Admin</span>
        <ChevronDown className="size-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card p-2 shadow-lg">
          {["Profile", "Account settings", "Keyboard shortcuts"].map((item) => (
            <button
              className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const actions = adminQuickActions.filter((action) =>
    `${action.label} ${action.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-20"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Command className="size-5 text-muted-foreground" />
          <Input
            autoFocus
            className="border-0 px-0 focus-visible:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands, settings, and placeholders"
            value={query}
          />
          <Button
            aria-label="Close command palette"
            onClick={() => onOpenChange(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {actions.length > 0 ? (
            actions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left hover:bg-muted"
                  key={action.label}
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  <Icon className="mt-0.5 size-4 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">{action.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ href: "/admin", label: "Admin" }];

  parts.slice(1).forEach((part, index) => {
    crumbs.push({
      href: `/${parts.slice(0, index + 2).join("/")}`,
      label: toTitle(part),
    });
  });

  return crumbs;
}

function toTitle(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
