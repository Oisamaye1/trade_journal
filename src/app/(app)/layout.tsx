import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/app-shell/logo";
import { MobileBottomNav } from "@/components/app-shell/mobile-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { UserMenu, UserMenuSkeleton } from "@/components/app-shell/user-menu";

export const metadata: Metadata = {
  // Authenticated pages must never be indexed (CLAUDE.md rule 12).
  robots: { index: false, follow: false },
};

/**
 * App shell. The chrome is static (prerendered); anything that reads the session sits behind
 * <Suspense> as required by Cache Components. Auth is enforced by requireUser() in each data
 * loader — the proxy redirect is only an optimistic check.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const userMenu = (
    <Suspense fallback={<UserMenuSkeleton />}>
      <UserMenu />
    </Suspense>
  );

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar footer={userMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-surface/95 px-4 backdrop-blur md:hidden">
          <Logo href="/dashboard" />
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav moreFooter={userMenu} />
    </div>
  );
}
