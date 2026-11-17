import { LineChart } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NAV } from "@/components/app-shell/nav-config";
import { NavAction } from "@/components/app-shell/nav-action";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth";
import { listActiveAccounts } from "@/server/queries/accounts";
import { getProfile } from "@/server/queries/profiles";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Combined performance and recent trades across all your trading accounts.",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="All accounts combined." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const [profile, accounts] = await Promise.all([getProfile(user.id), listActiveAccounts(user.id)]);

  return (
    <div className="grid gap-6">
      {accounts.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No accounts yet"
          description="Add your first trading account, then import an MT5 report or record a trade. Your combined stats will appear here."
          actions={
            <>
              <NavAction item={NAV.accounts} label="Add an account" />
              <NavAction item={NAV.import} label="Import MT5 report" variant="outline" />
            </>
          }
        />
      ) : (
        // Phase 3 replaces this with KPI tiles, balance curve and recent trades.
        <p className="text-sm text-muted-foreground">
          {accounts.length} active {accounts.length === 1 ? "account" : "accounts"}.
        </p>
      )}
      <p className="text-xs text-muted-foreground" data-testid="profile-timezone">
        Times are shown in <span className="font-medium text-foreground">{profile.timezone}</span>.
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}
