"use client";

import { Button, Card, CardContent } from "@trustfirst/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="size-8 text-amber-700 dark:text-amber-300" />
        <h2 className="mt-4 text-lg font-semibold">This workspace could not be loaded</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">No changes were made. Retry the request, and contact the administrator if the problem continues.</p>
        <Button className="mt-5" onClick={reset} type="button" variant="outline"><RefreshCw className="size-4" />Retry</Button>
      </CardContent>
    </Card>
  );
}
