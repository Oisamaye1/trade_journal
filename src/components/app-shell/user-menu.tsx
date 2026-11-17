import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";
import { getEntitlements } from "@/server/entitlements";
import { Badge } from "@/components/ui/badge";

const PLAN_LABEL = { free: "Free", pro: "Pro", elite: "Elite" } as const;

/** Signed-in user summary, theme and sign-out. Reads the session: render inside <Suspense>. */
export async function UserMenu() {
  const user = await requireUser();
  const entitlements = await getEntitlements(user.id);
  return (
    <div className="grid gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm" title={user.email ?? undefined}>
          <span className="sr-only">Signed in as </span>
          {user.email ?? "Signed in"}
        </p>
        <Badge variant="info">{PLAN_LABEL[entitlements.plan]}</Badge>
      </div>
      <ThemeToggle />
      <form action={signOut}>
        <button
          type="submit"
          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading account menu">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
