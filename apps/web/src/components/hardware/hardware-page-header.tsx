import { Badge, Button } from "@trustfirst/ui";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function HardwarePageHeader({
  actionHref,
  actionIcon: ActionIcon,
  actionLabel,
  description,
  eyebrow,
  title,
}: {
  actionHref?: string;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge>{eyebrow}</Badge>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{ActionIcon ? <ActionIcon className="size-4" /> : null}{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
