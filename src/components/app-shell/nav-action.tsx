import Link from "next/link";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { NavItem } from "./nav-config";

/**
 * A call-to-action pointing at a nav destination. Renders a disabled button labelled
 * "(coming soon)" until that route ships, so empty states never link to a 404.
 */
export function NavAction({
  item,
  label,
  variant,
}: {
  item: NavItem;
  label?: string;
  variant?: ButtonProps["variant"];
}) {
  const Icon = item.icon;
  const text = label ?? item.label;
  if (!item.available) {
    return (
      <Button variant={variant} disabled>
        <Icon aria-hidden />
        {text}
        <span className="text-xs font-normal">(coming soon)</span>
      </Button>
    );
  }
  return (
    <Button asChild variant={variant}>
      <Link href={item.href}>
        <Icon aria-hidden />
        {text}
      </Link>
    </Button>
  );
}
