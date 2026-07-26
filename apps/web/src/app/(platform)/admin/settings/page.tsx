import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Building2, Languages, Printer, ShieldCheck, WalletCards } from "lucide-react";
import Image from "next/image";
import { ChangePasswordPanel } from "@/components/auth/change-password-panel";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireCurrentUser();
  const tenantId = user.activeTenantId ?? "public";
  const prisma = getPrisma();
  const [tenant, settings, memberships] = await Promise.all([
    prisma.tenant.findUnique({ select: { branding: true, name: true, primaryDomain: true, status: true }, where: { id: tenantId } }),
    prisma.hardwareBusinessSettings.findUnique({ where: { tenantId } }),
    prisma.tenantMembership.findMany({
      include: { role: { include: { permissions: { include: { permission: true } } } }, user: { select: { email: true, id: true, name: true } } },
      where: { status: "ACTIVE", tenantId },
    }),
  ]);
  const branding = asRecord(tenant?.branding);
  const identity = asRecord(branding.officialIdentity);
  const address = readString(identity.principalAddressDisplay) ?? formatAddress(settings?.address);
  const locked = identity.status === "LOCKED";
  const commercialSettingsPending = settings?.financialYear === "PENDING";
  const roles = [...new Map(memberships.map((membership) => [membership.role.key, membership.role])).values()];
  const currentMembership = memberships.find((membership) => membership.userId === user.id);
  const resetAllowed = Boolean(
    currentMembership?.role.permissions.some((entry) => entry.permission.key === "*") ||
    currentMembership?.role.permissions.some((entry) => entry.permission.key === "auth.users.manage") ||
    currentMembership?.role.key.includes("admin") ||
    currentMembership?.role.key.includes("owner"),
  );
  const resetUsers = resetAllowed
    ? memberships.filter((membership) => membership.userId !== user.id).map((membership) => membership.user)
    : [];

  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Official legal identity is read-only. Client-controlled commercial settings remain visibly pending until confirmed."
        eyebrow="Administration"
        title="Settings"
      />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-primary" />Business profile</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="flex size-28 items-center justify-center rounded-md border border-border bg-white p-2">
              <Image alt="Mangalam Sanitary approved logo" className="size-full object-contain" height={112} src="/api/tenants/branding/logo" unoptimized width={112} />
            </div>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Setting label="Trade name" value={readString(identity.tradeName) ?? settings?.firmName ?? tenant?.name} locked={locked} />
              <Setting label="Legal proprietor" value={readString(identity.proprietorName)} locked={locked} />
              <Setting label="GSTIN" value={readString(identity.gstin) ?? settings?.gstin} locked={locked} />
              <Setting label="Constitution" value={readString(identity.constitution)} locked={locked} />
              <Setting className="sm:col-span-2" label="Registered address" value={address} locked={locked} />
              <Setting label="Domain" value={tenant?.primaryDomain ?? "mangalamsanitary.in"} locked />
              <Setting label="Tenant status" value={tenant?.status ?? "Unknown"} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="size-4 text-primary" />Invoice and print</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Setting label="Invoice prefix" value={pendingValue(settings?.invoicePrefix)} />
            <Setting label="GST pricing mode" value={commercialSettingsPending ? null : pendingValue(settings?.defaultGstMode)} />
            <Setting label="Financial year" value={pendingValue(settings?.financialYear)} />
            <Setting label="Terms and footer" value={pendingValue(settings?.termsFooter)} />
            <Setting label="Round-off" value={commercialSettingsPending ? null : settings ? (settings.roundOffEnabled ? "Enabled" : "Disabled") : null} />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="size-4 text-primary" />Payment modes</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"].map((mode) => <Badge key={mode}>{mode}</Badge>)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Roles</CardTitle></CardHeader>
          <CardContent className="space-y-2">{roles.length ? roles.map((role) => <div className="rounded-md border border-border p-3 text-sm" key={role.key}><p className="font-medium">{humanize(role.key)}</p><p className="mt-1 text-xs text-muted-foreground">{role.description ?? "Role permissions are centrally managed."}</p></div>) : <Waiting />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Languages className="size-4 text-primary" />Language</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm"><Setting label="Current" value="English" /><Setting label="Hindi labels" value="Foundation available" /><p className="text-xs text-muted-foreground">Default client language is waiting for confirmation.</p></CardContent>
        </Card>
      </section>
      <ChangePasswordPanel resetUsers={resetUsers} />
    </div>
  );
}

function Setting({ className, label, locked, value }: { className?: string; label: string; locked?: boolean; value: string | null | undefined }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
        {value ? value : <span className="text-amber-700 dark:text-amber-300">WAITING FOR CLIENT CONFIRMATION</span>}
        {locked ? <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Locked</Badge> : null}
      </dd>
    </div>
  );
}

function Waiting() {
  return <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No assigned roles are available.</p>;
}

function pendingValue(value: string | null | undefined) {
  if (!value || value.includes("PENDING")) return null;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatAddress(value: unknown) {
  const record = asRecord(value);
  const parts = Object.values(record).filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  return parts.length ? parts.join(", ") : null;
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
