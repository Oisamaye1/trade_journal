import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Empty states always explain what's missing and offer the next action (CLAUDE.md rule 11). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  headingLevel = 2,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
          <Icon aria-hidden className="size-6 text-muted-foreground" />
        </div>
      ) : null}
      <Heading className="text-base font-semibold">{title}</Heading>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actions ? (
        <div className="mt-2 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
