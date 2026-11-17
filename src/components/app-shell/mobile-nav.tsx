"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV, MORE_NAV, isActive, type NavItem } from "./nav-config";
import { NavLink } from "./nav-link";

function BottomItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const base =
    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-none";

  if (!item.available) {
    return (
      <span aria-disabled="true" className={cn(base, "text-muted-foreground/60")}>
        <Icon aria-hidden className="size-5" />
        <span>{item.label}</span>
        <span className="sr-only">(coming soon)</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(base, active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
    >
      <Icon aria-hidden className="size-5" />
      <span>{item.label}</span>
    </Link>
  );
}

/** Fixed bottom navigation for small screens, with a "More" sheet for secondary routes. */
export function MobileBottomNav({ moreFooter }: { moreFooter: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV.map((item) => (
          <li key={item.href}>
            <BottomItem item={item} />
          </li>
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] leading-none font-medium text-muted-foreground hover:text-foreground">
              <MoreHorizontal aria-hidden className="size-5" />
              <span>More</span>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetTitle>More</SheetTitle>
              <SheetDescription className="sr-only">
                Other sections and account options
              </SheetDescription>
              <ul className="grid gap-0.5">
                {MORE_NAV.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
              <div className="border-t pt-4">{moreFooter}</div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
