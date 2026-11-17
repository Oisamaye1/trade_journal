import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Callers must pass `htmlFor` (or wrap the control) so the label is associated. */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}
