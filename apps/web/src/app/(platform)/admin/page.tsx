import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { AppShell } from "@/components/shell/app-shell";

export default function AdminPage() {
  return (
    <AppShell mode="admin">
      <div className="mb-8">
        <Badge>Admin shell</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Command center</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Foundation for tenant operations, access management, and future
          administrative modules.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
            <CardDescription>Role-aware navigation and session model are ready.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add invitation, user management, and audit trails in future modules.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Workspace for admin workflows.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Business capabilities are intentionally deferred.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
