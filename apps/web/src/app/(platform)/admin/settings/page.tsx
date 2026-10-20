import { getPrisma, type Prisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Building2, Languages, Printer, ShieldCheck, WalletCards } from "lucide-react";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ChangePasswordPanel } from "@/components/auth/change-password-panel";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/domain/errors";
import { PermissionResolverService } from "@/server/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ gstin?: string }> }) {
  const { gstin: gstinStatus } = await searchParams;
  const user = await requireCurrentUser();
  const tenantId = user.activeTenantId ?? "public";
  const prisma = getPrisma();
  const [tenant, settings, memberships] = await Promise.all([
    prisma.tenant.findUnique({ select: { branding: true, name: true, primaryDomain: true, slug: true, status: true }, where: { id: tenantId } }),
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
  const canEditGstin = tenant?.slug === "manglam-trading-demo" && Boolean(
    currentMembership?.role.permissions.some((entry) => ["*", "hardware.settings.manage"].includes(entry.permission.key)),
  );
  const resetUsers = resetAllowed
    ? memberships.filter((membership) => membership.userId !== user.id).map((membership) => membership.user)
    : [];

  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Legal identity stays protected. Authorized administrators can correct the GSTIN, which is used in invoice printing."
        eyebrow="Administration"
        title="Settings"
      />
      {gstinStatus === "updated" ? <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">GSTIN saved. Invoice previews use the updated business GSTIN.</p> : null}
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
              <GstinSetting value={settings?.gstin ?? readString(identity.gstin) ?? ""} editable={canEditGstin} />
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


function GstinSetting({ value, editable }: { value: string; editable: boolean }) {
  if (!editable) return <Setting label="GSTIN" value={value} locked />;
  return (
    <div className="sm:col-span-2">
      <dt className="text-xs font-medium uppercase text-muted-foreground">GSTIN</dt>
      <dd className="mt-2">
        <form action={saveMangalamGstin} className="flex flex-wrap items-end gap-2">
          <input aria-label="GSTIN" autoCapitalize="characters" autoComplete="off" className="h-10 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm uppercase" defaultValue={value} maxLength={15} minLength={15} name="gstin" pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]" required spellCheck={false} type="text" />
          <input name="expectedGstin" type="hidden" value={value} />
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90" type="submit">Save GSTIN</button>
        </form>
        <p className="mt-1 text-xs text-muted-foreground">Only authorized administrators can edit. The latest GSTIN is used on invoice previews and reprints.</p>
      </dd>
    </div>
  );
}

async function saveMangalamGstin(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const tenantId = user.activeTenantId;
  if (!tenantId) throw new AppError({ code: "FORBIDDEN", message: "An active tenant is required.", status: 403 });
  const prisma = getPrisma();
  await new PermissionResolverService(prisma).enforce({
    policy: { allOf: ["hardware.settings.manage"] },
    tenantId,
    userId: user.id,
  });

  const raw = formData.get("gstin");
  const expected = formData.get("expectedGstin");
  const gstin = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (typeof expected !== "string" || !isValidGstin(gstin)) {
    throw new AppError({ code: "VALIDATION_ERROR", message: "Enter a valid 15-character GSTIN.", status: 422 });
  }

  await prisma.$transaction(async (tx) => {
    const [tenant, business] = await Promise.all([
      tx.tenant.findUnique({ select: { slug: true, branding: true, settings: true }, where: { id: tenantId } }),
      tx.hardwareBusinessSettings.findUnique({ select: { gstin: true }, where: { tenantId } }),
    ]);
    if (tenant?.slug !== "manglam-trading-demo" || !business) {
      throw new AppError({ code: "FORBIDDEN", message: "Mangalam business profile not found.", status: 403 });
    }
    if ((business.gstin ?? "") !== expected) {
      throw new AppError({ code: "CONFLICT", message: "GSTIN changed in another session. Refresh and retry.", status: 409 });
    }
    if (business.gstin === gstin) return;

    const branding = asRecord(tenant.branding);
    const settings = asRecord(tenant.settings);
    const priorHistory = Array.isArray(settings.gstinChangeHistory) ? settings.gstinChangeHistory : [];
    const change = { at: new Date().toISOString(), by: user.id, from: business.gstin, to: gstin };
    await tx.hardwareBusinessSettings.update({ data: { gstin }, where: { tenantId } });
    await tx.tenant.update({
      data: {
        branding: { ...branding, officialIdentity: { ...asRecord(branding.officialIdentity), gstin } } as Prisma.InputJsonValue,
        settings: {
          ...settings,
          officialIdentity: { ...asRecord(settings.officialIdentity), gstin },
          gstinChangeHistory: [...priorHistory.slice(-49), change],
        } as Prisma.InputJsonValue,
      },
      where: { id: tenantId },
    });
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?gstin=updated");
}

function isValidGstin(value: string) {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/u.test(value)) return false;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  let factor = 2;
  for (let index = value.length - 2; index >= 0; index -= 1) {
    const product = factor * chars.indexOf(value[index]!);
    sum += Math.floor(product / 36) + (product % 36);
    factor = factor === 2 ? 1 : 2;
  }
  return chars[(36 - (sum % 36)) % 36] === value.at(-1);
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
