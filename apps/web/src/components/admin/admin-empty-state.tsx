import { Button, Card, CardContent } from "@trustfirst/ui";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type AdminEmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: LucideIcon;
  title: string;
};

export function AdminEmptyState({
  actionHref,
  actionLabel,
  description,
  icon: Icon,
  title,
}: AdminEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {actionLabel && actionHref ? (
          <Button asChild className="mt-5" type="button" variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
        {actionLabel && !actionHref ? (
          <Button className="mt-5" type="button" variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
