import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { Bell, Palette, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AdminEmptyState } from "./admin-empty-state";

const settingsSections = [
  {
    title: "General",
    description: "Tenant profile, regional defaults, and workspace identity.",
    icon: SlidersHorizontal,
  },
  {
    title: "Security",
    description: "Access policies, roles, and session controls.",
    icon: ShieldCheck,
  },
  {
    title: "Notifications",
    description: "Delivery preferences and admin alert rules.",
    icon: Bell,
  },
  {
    title: "Appearance",
    description: "Branding, theme defaults, and client-facing polish.",
    icon: Palette,
  },
];

export function SettingsShell() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Settings shell</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Admin settings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Static settings foundation for future tenant configuration workflows.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;

          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configuration controls will attach here when backend policies
                are introduced.
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AdminEmptyState
        description="No tenant settings are connected yet. This shell establishes layout, navigation, and empty-state patterns only."
        icon={SlidersHorizontal}
        title="Settings modules are not connected"
      />
    </div>
  );
}
