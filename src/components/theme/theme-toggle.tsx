"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { THEME_COOKIE } from "./theme-script";

type Pref = "light" | "dark" | "system";

const OPTIONS: { value: Pref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function apply(pref: Pref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePref = pref;
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
}

/** Segmented radio group: Light / Dark / System. */
export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const current = document.documentElement.dataset.themePref;
    // Sync with the value the pre-paint script resolved (not known during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === "light" || current === "dark" || current === "system") setPref(current);
  }, []);

  return (
    <fieldset className={cn("grid gap-1.5", className)}>
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Theme</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
        {OPTIONS.map(({ value, label, Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
              pref === value && "bg-surface text-foreground shadow-card",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={pref === value}
              onChange={() => {
                setPref(value);
                apply(value);
              }}
              className="sr-only"
            />
            <Icon aria-hidden className="size-3.5 shrink-0" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
