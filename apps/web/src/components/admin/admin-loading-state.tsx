import { Card, CardContent } from "@trustfirst/ui";
import { Loader2 } from "lucide-react";

export function AdminLoadingState({ label = "Loading admin workspace" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-48 items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
