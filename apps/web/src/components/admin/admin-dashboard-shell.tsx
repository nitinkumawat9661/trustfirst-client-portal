"use client";

import { Button, Input, cn } from "@trustfirst/ui";
import {
  Bell,
  ChevronDown,
  Command,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { OfflineSyncPanel } from "@/components/offline/offline-sync-panel";
import type { OfflineQueueScope } from "@/lib/offline-queue";
import { permittedAdminNavigation } from "./admin-navigation";

type AdminDashboardShellProps = {
  brandName: string;
  children: ReactNode;
  offlineScope: OfflineQueueScope;
  permissions: readonly string[];
  signOutCallbackUrl: string;
  userName: string;
};

export function AdminDashboardShell({
  brandName,
  children,
  offlineScope,
  permissions,
  signOutCallbackUrl,
  userName,
}: AdminDashboardShellProps) {
  const pathname = usePathname();
  const navigation = useMemo(() => permittedAdminNavigation(permissions), [permissions]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("business-workspace.theme");
    const initial = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initial === "dark");
    queueMicrotask(() => setTheme(initial));
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
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("business-workspace.theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        brandName={brandName}
        mobileOpen={mobileOpen}
        navigation={navigation}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95">
          <div className="flex min-h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            <Button aria-label="Open navigation" className="lg:hidden" onClick={() => setMobileOpen(true)} size="sm" type="button" variant="ghost">
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <AdminBreadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Button aria-label="Open search" className="md:hidden" onClick={() => setCommandOpen(true)} size="sm" type="button" variant="ghost">
              <Search className="size-5" />
            </Button>
            <GlobalSearch onOpen={() => setCommandOpen(true)} />
            <Button aria-label="Toggle theme" onClick={toggleTheme} size="sm" type="button" variant="ghost">
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <NotificationBell open={notificationsOpen} onOpenChange={setNotificationsOpen} />
            <UserMenu open={userMenuOpen} onOpenChange={setUserMenuOpen} signOutCallbackUrl={signOutCallbackUrl} userName={userName} />
          </div>
        </header>
        <main className="px-3 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
      <CommandPalette navigation={navigation} open={commandOpen} onOpenChange={setCommandOpen} />
      <OfflineSyncPanel scope={offlineScope} />
    </div>
  );
}

function AdminSidebar({
  brandName,
  mobileOpen,
  navigation,
  onClose,
  pathname,
}: {
  brandName: string;
  mobileOpen: boolean;
  navigation: ReturnType<typeof permittedAdminNavigation>;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <>
      <button
        aria-label="Close navigation overlay"
        className={cn("fixed inset-0 z-30 bg-black/55 lg:hidden", mobileOpen ? "block" : "hidden")}
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#151515] text-white transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-20 items-center gap-3 border-b border-white/10 px-4">
          <Image alt={`${brandName} logo`} className="size-12 object-contain" height={48} src="/api/tenants/branding/logo" unoptimized width={48} />
          <Link className="min-w-0 flex-1" href="/admin" onClick={onClose}>
            <span className="block truncate text-sm font-semibold">{brandName}</span>
            <span className="block text-xs text-[#d2a24c]">Business ERP</span>
          </Link>
          <Button aria-label="Close navigation" className="text-white hover:bg-white/10 lg:hidden" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>
        <nav aria-label="Business navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2a24c]",
                  active ? "bg-[#b7832f] text-white" : "text-zinc-300 hover:bg-white/8 hover:text-white",
                )}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-zinc-400">
          Secure tenant workspace
        </div>
      </aside>
    </>
  );
}

function AdminBreadcrumbs({ breadcrumbs }: { breadcrumbs: Array<{ href: string; label: string }> }) {
  const current = breadcrumbs.at(-1)?.label ?? "Dashboard";

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <span className="block truncate text-sm font-medium md:hidden">{current}</span>
      <ol className="hidden min-w-0 items-center gap-2 text-sm md:flex">
        {breadcrumbs.map((crumb, index) => (
          <li className="flex min-w-0 items-center gap-2" key={crumb.href}>
            {index > 0 ? <span className="text-muted-foreground">/</span> : null}
            {index === breadcrumbs.length - 1 ? (
              <span className="truncate font-medium">{crumb.label}</span>
            ) : (
              <Link className="truncate text-muted-foreground hover:text-foreground" href={crumb.href}>{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function GlobalSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="hidden h-10 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground hover:bg-muted md:flex" onClick={onOpen} type="button">
      <Search className="size-4" />
      <span className="flex-1">Go to module</span>
      <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd>
    </button>
  );
}

function NotificationBell({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [items, setItems] = useState<Array<{ actionHref: string; amountCents?: number; currentStock?: number; id: string; label: string; title: string }>>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/hardware/reminders")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.ok) setItems(result.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  return (
    <div className="relative">
      <Button aria-expanded={open} aria-label="Notifications" onClick={() => onOpenChange(!open)} size="sm" type="button" variant="ghost">
        <Bell className="size-5" />
        {items.length ? <span className="sr-only">{items.length} reminders</span> : null}
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-card p-4 shadow-lg">
          <p className="font-medium">Notifications</p>
          {items.length ? (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link className="block rounded-md border border-border p-2 text-sm hover:bg-muted" href={item.actionHref} onClick={() => onOpenChange(false)}>
                    <span className="block font-medium">{item.title}</span>
                    <span className="block text-muted-foreground">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">No daily reminders.</p>}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu({
  open,
  onOpenChange,
  signOutCallbackUrl,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signOutCallbackUrl: string;
  userName: string;
}) {
  return (
    <div className="relative">
      <Button aria-expanded={open} aria-label="User menu" onClick={() => onOpenChange(!open)} size="sm" type="button" variant="outline">
        <UserRound className="size-4" />
        <span className="hidden max-w-28 truncate sm:inline">{userName}</span>
        <ChevronDown className="size-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-52 rounded-md border border-border bg-card p-2 shadow-lg">
          <Link className="flex min-h-10 items-center rounded-md px-3 text-sm hover:bg-muted" href="/admin/settings" onClick={() => onOpenChange(false)}>Settings</Link>
          <button className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm hover:bg-muted" onClick={() => signOut({ callbackUrl: signOutCallbackUrl })} type="button">Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

function CommandPalette({
  navigation,
  open,
  onOpenChange,
}: {
  navigation: ReturnType<typeof permittedAdminNavigation>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const results = navigation.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  if (!open) return null;

  return (
    <div
      aria-labelledby="command-palette-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-3 pt-16 sm:pt-24"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-md border border-border bg-card shadow-xl">
        <h2 className="sr-only" id="command-palette-title">Go to a business module</h2>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Command className="size-5 text-muted-foreground" />
          <Input autoFocus className="border-0 px-0 focus-visible:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Search modules" value={query} />
          <Button aria-label="Close command palette" onClick={() => onOpenChange(false)} size="sm" type="button" variant="ghost"><X className="size-4" /></Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {results.length ? results.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted" href={item.href} key={item.href} onClick={() => onOpenChange(false)}>
                <Icon className="size-4 text-primary" />
                {item.label}
              </Link>
            );
          }) : <p className="p-6 text-center text-sm text-muted-foreground">No matching module.</p>}
        </div>
      </div>
    </div>
  );
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ href: "/admin", label: "Dashboard" }];
  parts.slice(1).forEach((part, index) => {
    crumbs.push({
      href: `/${parts.slice(0, index + 2).join("/")}`,
      label: part.split("-").map((value) => value.charAt(0).toUpperCase() + value.slice(1)).join(" "),
    });
  });
  return crumbs;
}
