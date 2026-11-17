"use client";

import type { ReactNode } from "react";
import { Logo } from "./logo";
import { SIDEBAR_SECTIONS } from "./nav-config";
import { NavLink } from "./nav-link";

export function Sidebar({ footer }: { footer: ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-surface md:flex">
      <div className="flex h-14 items-center px-4">
        <Logo href="/dashboard" />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
        {SIDEBAR_SECTIONS.map((section, i) => (
          <div key={section.label || i} className="mb-4">
            {section.label ? (
              <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.label}
              </p>
            ) : null}
            <ul className="grid gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t p-3">{footer}</div>
    </aside>
  );
}
