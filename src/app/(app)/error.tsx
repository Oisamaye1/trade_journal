"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border bg-surface px-6 py-10 text-center"
    >
      <AlertTriangle aria-hidden className="size-8 text-warning" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page couldn&apos;t load. Your data is safe. Try again, and if it keeps happening,
        reload the page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
