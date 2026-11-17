import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Data table. The wrapper scrolls horizontally on its own so the PAGE never does (CLAUDE.md
 * rule 9). Below `md`, prefer a card list instead of a table for wide data.
 */
export function Table({
  className,
  containerClassName,
  label,
  ...props
}: ComponentProps<"table"> & { containerClassName?: string; label?: string }) {
  return (
    <div
      className={cn(
        "relative w-full overflow-x-auto rounded-lg border bg-surface",
        containerClassName,
      )}
      // Scrollable regions must be keyboard reachable and named for screen readers.
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-muted [&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-surface-muted/60", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle whitespace-nowrap", className)} {...props} />;
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption className={cn("p-3 text-sm text-muted-foreground", className)} {...props} />;
}
