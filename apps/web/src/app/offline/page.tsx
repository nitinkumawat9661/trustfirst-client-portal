import { Button, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <WifiOff aria-hidden className="size-6 text-muted-foreground" />
            <CardTitle>Offline mode</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            TrustFirst can queue supported hardware actions on this device while the network is unavailable. Return to the
            dashboard when your connection is restored to process pending actions.
          </p>
          <Button asChild>
            <Link href="/admin/hardware/inventory">Back to hardware dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
