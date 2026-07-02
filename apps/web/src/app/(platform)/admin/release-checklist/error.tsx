"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function ReleaseChecklistError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Release checklist could not load</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Confirm environment variables and database access, then retry.</p>
        <Button onClick={reset} type="button">Try again</Button>
      </CardContent>
    </Card>
  );
}
