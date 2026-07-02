"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function HardwareDemoError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo readiness could not load</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Refresh the checklist after confirming the tenant and hardware permissions.</p>
        <Button onClick={reset} type="button">Try again</Button>
      </CardContent>
    </Card>
  );
}
