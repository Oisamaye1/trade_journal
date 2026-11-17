import Link from "next/link";
import { Logo } from "@/components/app-shell/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <Button asChild variant="outline" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          <p>
            PropBook is a journaling and record-keeping tool. Nothing in it is financial advice.
            Always verify rules with your prop firm.
          </p>
        </div>
      </footer>
    </div>
  );
}
