"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Database, RotateCcw } from "lucide-react";
import { useState } from "react";

type DemoActionState =
  | { message: string; status: "error" | "success" }
  | { message: ""; status: "idle" };

export function HardwareDemoControlPanel() {
  const [pendingAction, setPendingAction] = useState<"reset" | "seed" | null>(null);
  const [state, setState] = useState<DemoActionState>({ message: "", status: "idle" });

  async function runSeed() {
    await runAction("seed", "POST", "Demo data seeded successfully.");
  }

  async function runReset() {
    const confirmed = window.confirm("Reset generic hardware demo data for this tenant? This does not remove live business records outside the demo sample set.");
    if (!confirmed) return;
    await runAction("reset", "DELETE", "Demo data reset completed.");
  }

  async function runAction(action: "reset" | "seed", method: "DELETE" | "POST", successMessage: string) {
    setPendingAction(action);
    setState({ message: "", status: "idle" });
    try {
      const response = await fetch("/api/hardware/demo-seed", {
        method,
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Demo action failed.");
      }
      setState({ message: successMessage, status: "success" });
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "Demo action failed.",
        status: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Demo mode controls</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Generic seed data only. No firm-specific names are hardcoded.</p>
          </div>
          <Badge>Safe controls</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={pendingAction !== null} onClick={runSeed} type="button">
            <Database className="size-4" />
            {pendingAction === "seed" ? "Seeding..." : "Seed demo data"}
          </Button>
          <Button disabled={pendingAction !== null} onClick={runReset} type="button" variant="outline">
            <RotateCcw className="size-4" />
            {pendingAction === "reset" ? "Resetting..." : "Reset demo data"}
          </Button>
        </div>
        {state.status !== "idle" ? (
          <div
            className={state.status === "success"
              ? "rounded-md border border-border bg-muted p-3 text-sm"
              : "rounded-md border border-destructive/40 p-3 text-sm text-destructive"}
            role="status"
          >
            {state.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
