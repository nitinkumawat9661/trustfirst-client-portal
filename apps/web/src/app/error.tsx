"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { logError } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { digest: error.digest, surface: "app-error-boundary" });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            The portal hit an unexpected error. Try again or contact support if
            it continues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={reset} type="button">
            <RotateCcw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
