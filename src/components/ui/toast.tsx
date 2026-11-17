"use client";

import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };

/* A tiny client-side store so `toast()` can be called from any client component or handler. */
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: { title: string; description?: string; variant?: ToastVariant }) {
  items = [...items, { id: nextId++, variant: "default", ...input }];
  emit();
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ToastItem[] = [];

/** Render once in the root layout. */
export function Toaster() {
  const toasts = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          type={t.variant === "error" ? "foreground" : "background"}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={cn(
            "relative grid gap-1 rounded-lg border bg-surface p-4 pr-10 shadow-card",
            t.variant === "success" && "border-l-4 border-l-profit",
            t.variant === "error" && "border-l-4 border-l-loss",
          )}
        >
          <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
          {t.description ? (
            <ToastPrimitive.Description className="text-sm text-muted-foreground">
              {t.description}
            </ToastPrimitive.Description>
          ) : null}
          <ToastPrimitive.Close className="absolute top-2 right-2 rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted">
            <X aria-hidden className="size-4" />
            <span className="sr-only">Dismiss notification</span>
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none md:bottom-0" />
    </ToastPrimitive.Provider>
  );
}
