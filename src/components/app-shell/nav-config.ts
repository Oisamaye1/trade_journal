import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Copy,
  LayoutDashboard,
  Plus,
  Settings,
  Trophy,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * False until the route ships. Unavailable items render as disabled "Soon" entries instead of
   * links, so nothing navigates to a 404. Flip to true in the phase that builds the page.
   */
  available: boolean;
};

export const NAV = {
  dashboard: { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  journal: { href: "/journal", label: "Journal", icon: BookOpen, available: false },
  accounts: { href: "/accounts", label: "Accounts", icon: Wallet, available: false },
  addTrade: { href: "/trades/new", label: "Add trade", icon: Plus, available: false },
  import: { href: "/import", label: "Import", icon: Upload, available: false },
  analytics: { href: "/analytics", label: "Analytics", icon: BarChart3, available: false },
  prop: { href: "/prop", label: "Prop ledger", icon: Trophy, available: false },
  reviews: { href: "/reviews", label: "Weekly reviews", icon: CalendarCheck, available: false },
  copyGroups: { href: "/copy-groups", label: "Copy groups", icon: Copy, available: false },
  settings: { href: "/settings", label: "Settings", icon: Settings, available: false },
} satisfies Record<string, NavItem>;

/** Desktop sidebar, grouped. */
export const SIDEBAR_SECTIONS: { label: string; items: NavItem[] }[] = [
  { label: "Trading", items: [NAV.dashboard, NAV.journal, NAV.accounts, NAV.import] },
  { label: "Review", items: [NAV.analytics, NAV.reviews] },
  { label: "Prop", items: [NAV.prop, NAV.copyGroups] },
  { label: "", items: [NAV.settings] },
];

/** Mobile bottom bar: Dashboard, Journal, Add, Accounts (+ "More" sheet for the rest). */
export const BOTTOM_NAV: NavItem[] = [NAV.dashboard, NAV.journal, NAV.addTrade, NAV.accounts];

export const MORE_NAV: NavItem[] = [
  NAV.import,
  NAV.analytics,
  NAV.reviews,
  NAV.prop,
  NAV.copyGroups,
  NAV.settings,
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
