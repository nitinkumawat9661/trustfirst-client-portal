"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { HardwareMovementSummary, HardwareProductSummary } from "@/server/hardware";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { code: string; id: string; name: string };

const movementSchema = z.object({
  locationId: z.string().min(1, "Select a location."),
  notes: z.string().max(2000),
  productId: z.string().min(1, "Select a product."),
  quantity: z.number().int().nonnegative(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
}).superRefine((value, context) => {
  if (value.type !== "ADJUSTMENT" && value.quantity === 0) {
    context.addIssue({
      code: "custom",
      message: "Stock in and stock out quantities must be greater than zero.",
      path: ["quantity"],
    });
  }
});

const locationSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
});

export function HardwareInventoryPanel({
  locations,
  movements,
  products,
}: {
  locations: LocationOption[];
  movements: HardwareMovementSummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(locations.length === 0);
  const movementForm = useForm<z.infer<typeof movementSchema>>({
    defaultValues: { locationId: locations[0]?.id ?? "", notes: "", productId: "", quantity: 1, type: "STOCK_IN" },
    resolver: zodResolver(movementSchema),
  });
  const locationForm = useForm<z.infer<typeof locationSchema>>({
    defaultValues: { code: "", name: "" },
    resolver: zodResolver(locationSchema),
  });
  const movementType = useWatch({ control: movementForm.control, name: "type" });

  async function submitMovement(values: z.infer<typeof movementSchema>) {
    if (
      (values.type === "STOCK_OUT" || values.type === "ADJUSTMENT") &&
      !window.confirm(
        values.type === "ADJUSTMENT"
          ? `Set this product's stock level to ${values.quantity}?`
          : `Record stock outward quantity ${values.quantity}?`,
      )
    ) {
      return;
    }
    setError(null);
    const result = await postHardwareJson<unknown>("/api/hardware/inventory", values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    movementForm.reset({ ...values, notes: "", quantity: 1 });
    router.refresh();
  }

  async function submitLocation(values: z.infer<typeof locationSchema>) {
    setError(null);
    const result = await postHardwareJson<unknown>("/api/hardware/locations", values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    locationForm.reset();
    setLocationOpen(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Record stock movement</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={movementForm.handleSubmit(submitMovement)}>
              <Field error={movementForm.formState.errors.type?.message} label="Movement">
                <select className={selectClassName} {...movementForm.register("type")}>
                  <option value="STOCK_IN">Stock inward</option>
                  <option value="STOCK_OUT">Stock outward</option>
                  <option value="ADJUSTMENT">Set absolute stock level</option>
                </select>
              </Field>
              <Field error={movementForm.formState.errors.productId?.message} label="Product">
                <select className={selectClassName} {...movementForm.register("productId")}>
                  <option value="">Select product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                </select>
              </Field>
              <Field error={movementForm.formState.errors.locationId?.message} label="Location / godown">
                <select className={selectClassName} {...movementForm.register("locationId")}>
                  <option value="">Select location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
              <Field
                error={movementForm.formState.errors.quantity?.message}
                label={movementType === "ADJUSTMENT" ? "New stock level" : "Quantity"}
              >
                <Input inputMode="numeric" min={movementType === "ADJUSTMENT" ? "0" : "1"} step="1" type="number" {...movementForm.register("quantity", { valueAsNumber: true })} />
              </Field>
              <Field error={movementForm.formState.errors.notes?.message} label="Reference / notes">
                <Input {...movementForm.register("notes")} />
              </Field>
              {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
              <Button className="w-full" disabled={products.length === 0 || locations.length === 0 || movementForm.formState.isSubmitting} type="submit">
                Save movement
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setLocationOpen((open) => !open)} type="button" variant="outline"><Warehouse className="size-4" />Add stock location</Button>
        {locationOpen ? (
          <Card>
            <CardHeader><CardTitle>New stock location</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={locationForm.handleSubmit(submitLocation)}>
                <Field error={locationForm.formState.errors.name?.message} label="Location name"><Input {...locationForm.register("name")} /></Field>
                <Field error={locationForm.formState.errors.code?.message} label="Location code"><Input className="uppercase" {...locationForm.register("code")} /></Field>
                <Button disabled={locationForm.formState.isSubmitting} type="submit">Save location</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Inventory ledger</CardTitle></CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
              <p className="font-medium">No stock movements have been recorded.</p>
              <p className="mt-1 text-sm text-muted-foreground">Opening stock must be entered from verified client data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Movement</th><th className="px-3 py-3 text-right">Quantity</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {movements.map((movement) => {
                    const Icon = movement.type === "STOCK_IN" ? ArrowDownToLine : movement.type === "STOCK_OUT" ? ArrowUpFromLine : SlidersHorizontal;
                    return (
                      <tr key={movement.id}>
                        <td className="px-3 py-3">{formatDate(movement.occurredAt)}</td>
                        <td className="px-3 py-3 font-medium">{movement.productName}</td>
                        <td className="px-3 py-3">{movement.locationName}</td>
                        <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><Icon className="size-4" />{movement.type.toLowerCase().replaceAll("_", " ")}</span></td>
                        <td className="px-3 py-3 text-right">{movement.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string | undefined; label: string }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}</label>;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
