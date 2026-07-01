import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";

export default function ClientPage() {
  return (
    <AppShell mode="client">
      <div className="mb-8">
        <Badge>Client shell</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Client workspace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Secure entry point for client-facing modules once document, task, and
          collaboration workflows are introduced.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portal home</CardTitle>
            <CardDescription>Mobile-first shell for authenticated clients.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-4">
              <p>
                Future modules can attach here without changing the navigation base.
              </p>
              <Button asChild size="sm">
                <Link href="/client/requirements/new">
                  New requirement
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security posture</CardTitle>
            <CardDescription>Sessions and database adapter are configured.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add authorization checks with each module boundary.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
