"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, type NavItem } from "./nav-config";

/** Sidebar / sheet navigation row. Unavailable routes render as a disabled "Soon" row. */
export function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const base = "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium";

  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed text-muted-foreground/70")}
      >
        <Icon aria-hidden className="size-4" />
        <span className="flex-1">{item.label}</span>
        <span className="rounded-full border px-1.5 text-[10px] tracking-wide uppercase">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        base,
        active
          ? "bg-surface-muted text-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {item.label}
    </Link>
  );
}
