"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  listQueuedOfflineParties,
  readActiveOfflineScope,
  type QueuedOfflinePartySummary,
} from "../../lib/offline-data";
import type { HardwarePartyRole, HardwarePartySummary } from "@/server/hardware";
import { postHardwarePartyJson } from "./hardware-api-client";

const partySchema = z.object({
  address: z.string().max(500),
  contact: z.string().max(30),
  gstin: z.string().max(20).refine(
    (value) => value === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i.test(value),
    { message: "Enter a valid 15-character GSTIN or leave it blank." },
  ),
  name: z.string().trim().min(2).max(200),
  openingBalance: z.string().refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Enter a valid non-negative amount.",
  }),
});

type PartyFormValues = z.infer<typeof partySchema>;
type PartyRow = HardwarePartySummary | QueuedOfflinePartySummary;

export function HardwarePartyPanel({
  parties,
  role,
}: {
  parties: HardwarePartySummary[];
  role: HardwarePartyRole;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [visibleParties, setVisibleParties] = useState<PartyRow[]>(parties);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PartyFormValues>({
    defaultValues: { address: "", contact: "", gstin: "", name: "", openingBalance: "" },
    resolver: zodResolver(partySchema),
  });
  const singular = role === "supplier" ? "supplier" : "customer";

  useEffect(() => {
    let cancelled = false;

    async function hydrateQueuedParties() {
      const scope = readActiveOfflineScope();
      const queued = scope ? await listQueuedOfflineParties(scope, role) : [];
      if (!cancelled) setVisibleParties(mergePartyRows(parties, queued));
    }

    void hydrateQueuedParties();
    window.addEventListener("trustfirst:offline-queue-changed", hydrateQueuedParties);
    window.addEventListener("online", hydrateQueuedParties);
    return () => {
      cancelled = true;
      window.removeEventListener("trustfirst:offline-queue-changed", hydrateQueuedParties);
      window.removeEventListener("online", hydrateQueuedParties);
    };
  }, [parties, role]);

  async function onSubmit(values: PartyFormValues) {
    setServerError(null);
    const openingBalanceCents = values.openingBalance
      ? Math.round(Number(values.openingBalance) * 100)
      : undefined;
    const result = await postHardwarePartyJson<PartyRow>({
      ...(values.address ? { address: values.address } : {}),
      ...(openingBalanceCents === undefined
        ? {}
        : { balanceDirection: "DR", openingBalanceCents }),
      ...(values.gstin ? { gstin: values.gstin.toUpperCase() } : {}),
      ...(values.contact ? { mobile: values.contact } : {}),
      name: values.name,
      role,
    });
    if (!result.ok) {
      setServerError(result.message || `${capitalize(singular)} could not be saved.`);
      return;
    }
    reset();
    setFormOpen(false);
    if (isQueuedParty(result.data)) {
      setVisibleParties((current) => mergePartyRows(
        current.filter((party) => !isQueuedParty(party)),
        [result.data],
      ));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen((open) => !open)} type="button">
          <Plus className="size-4" />Add {singular}
        </Button>
      </div>
      {formOpen ? (
        <Card>
          <CardHeader><CardTitle>New {singular}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit(onSubmit)}>
              <Field error={errors.name?.message} label={`${capitalize(singular)} name`} required><Input autoFocus {...register("name")} /></Field>
              <Field error={errors.contact?.message} label="Phone / contact"><Input autoComplete="tel" {...register("contact")} /></Field>
              <Field error={errors.gstin?.message} label="GSTIN"><Input className="uppercase" {...register("gstin")} /></Field>
              <Field error={errors.openingBalance?.message} label="Opening balance (INR)"><Input inputMode="decimal" min="0" step="0.01" type="number" {...register("openingBalance")} /></Field>
              <Field error={errors.address?.message} label="Address"><Input {...register("address")} /></Field>
              {serverError ? <p className="text-sm text-red-700 md:col-span-2 xl:col-span-4" role="alert">{serverError}</p> : null}
              <div className="flex gap-2 md:col-span-2 xl:col-span-4">
                <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : `Save ${singular}`}</Button>
                <Button onClick={() => setFormOpen(false)} type="button" variant="outline">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {visibleParties.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
          <UsersRound className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-medium">No {role === "supplier" ? "suppliers" : "customers"} have been added.</p>
          <p className="mt-1 text-sm text-muted-foreground">Only explicitly created {role === "supplier" ? "supplier" : "customer"} records appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">GSTIN</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Opening balance</th><th className="px-3 py-3">Current balance</th><th className="px-3 py-3">Side</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleParties.map((party) => (
                <tr key={party.id}>
                  <td className="px-3 py-3 font-medium">
                    <span>{party.name}</span>
                    {isQueuedParty(party) ? <Badge className="ml-2">{queueStatusLabel(party.queueStatus)}</Badge> : null}
                  </td>
                  <td className="px-3 py-3">{party.gstin ?? <Muted />}</td>
                  <td className="px-3 py-3">{party.contact ?? <Muted />}</td>
                  <td className="px-3 py-3">{money(party.openingBalanceCents)}</td>
                  <td className="px-3 py-3 font-medium">{money(party.currentBalanceCents)}</td>
                  <td className="px-3 py-3">{party.balanceSide ? <Badge>{party.balanceSide}</Badge> : <Muted text="Settled" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function mergePartyRows(
  serverParties: PartyRow[],
  queuedParties: QueuedOfflinePartySummary[],
): PartyRow[] {
  const queuedIds = new Set(queuedParties.map((party) => party.id));
  return [
    ...queuedParties,
    ...serverParties.filter((party) => !queuedIds.has(party.id) && !isQueuedParty(party)),
  ];
}

function isQueuedParty(party: PartyRow): party is QueuedOfflinePartySummary {
  return "offlineQueued" in party && party.offlineQueued === true;
}

function queueStatusLabel(status: QueuedOfflinePartySummary["queueStatus"]) {
  if (status === "failed") return "Sync failed";
  if (status === "syncing") return "Syncing";
  return "Pending sync";
}

function Field({ children, error, label, required }: { children: React.ReactNode; error?: string | undefined; label: string; required?: boolean | undefined }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required ? <span className="text-red-600"> *</span> : null}</span>{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}</label>;
}

function Muted({ text = "Not provided" }: { text?: string }) {
  return <span className="text-muted-foreground">{text}</span>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}
