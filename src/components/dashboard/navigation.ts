import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  FileText,
  Globe,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from "lucide-react";

export type DashboardNavTone =
  | "sky"
  | "amber"
  | "teal"
  | "rose"
  | "violet"
  | "emerald";

export type DashboardNavItem = {
  title: string;
  shortTitle: string;
  href: string;
  icon: LucideIcon;
  description: string;
  adminOnly?: boolean;
  badge?: string;
  tone: DashboardNavTone;
};

export const dashboardToneClasses: Record<
  DashboardNavTone,
  {
    activeItem: string;
    activeIcon: string;
    inactiveItem: string;
    inactiveIcon: string;
    badge: string;
  }
> = {
  sky: {
    activeItem:
      "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-[0_22px_40px_-22px_rgba(59,130,246,0.85)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-sky-500/10 hover:text-sky-950 dark:hover:bg-sky-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-sky-500/15 bg-sky-500/12 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/16 dark:text-sky-200",
    badge:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/16 dark:text-sky-200",
  },
  amber: {
    activeItem:
      "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_22px_40px_-22px_rgba(249,115,22,0.82)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-amber-500/10 hover:text-amber-950 dark:hover:bg-amber-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-amber-500/15 bg-amber-500/12 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/16 dark:text-amber-200",
    badge:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/16 dark:text-amber-200",
  },
  teal: {
    activeItem:
      "bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 text-white shadow-[0_22px_40px_-22px_rgba(6,182,212,0.82)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-teal-500/10 hover:text-teal-950 dark:hover:bg-teal-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-teal-500/15 bg-teal-500/12 text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/16 dark:text-teal-200",
    badge:
      "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/16 dark:text-teal-200",
  },
  rose: {
    activeItem:
      "bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600 text-white shadow-[0_22px_40px_-22px_rgba(236,72,153,0.8)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-rose-500/10 hover:text-rose-950 dark:hover:bg-rose-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-rose-500/15 bg-rose-500/12 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/16 dark:text-rose-200",
    badge:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/16 dark:text-rose-200",
  },
  violet: {
    activeItem:
      "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-white shadow-[0_22px_40px_-22px_rgba(139,92,246,0.82)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-violet-500/10 hover:text-violet-950 dark:hover:bg-violet-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-violet-500/15 bg-violet-500/12 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/16 dark:text-violet-200",
    badge:
      "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/16 dark:text-violet-200",
  },
  emerald: {
    activeItem:
      "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-[0_22px_40px_-22px_rgba(16,185,129,0.82)]",
    activeIcon: "border-white/15 bg-white/15 text-white",
    inactiveItem:
      "hover:bg-emerald-500/10 hover:text-emerald-950 dark:hover:bg-emerald-400/12 dark:hover:text-white",
    inactiveIcon:
      "border-emerald-500/15 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/16 dark:text-emerald-200",
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/16 dark:text-emerald-200",
  },
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    title: "Dashboard",
    shortTitle: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and daily signals",
    tone: "sky",
  },
  {
    title: "Tenders",
    shortTitle: "Tenders",
    href: "/tenders",
    icon: FileText,
    description: "Browse live opportunities",
    badge: "Live",
    tone: "amber",
  },
  {
    title: "Sources",
    shortTitle: "Sources",
    href: "/sources",
    icon: Globe,
    description: "Manage monitored portals",
    adminOnly: true,
    tone: "teal",
  },
  {
    title: "Subscribers",
    shortTitle: "People",
    href: "/subscribers",
    icon: Users,
    description: "Control digest recipients",
    adminOnly: true,
    tone: "rose",
  },
  {
    title: "Digest",
    shortTitle: "Digest",
    href: "/digest",
    icon: Mail,
    description: "Review outbound emails",
    tone: "violet",
  },
  {
    title: "Analytics",
    shortTitle: "Analytics",
    href: "/analytics",
    icon: BarChart,
    description: "Track trends and performance",
    adminOnly: true,
    tone: "violet",
  },
  {
    title: "Settings",
    shortTitle: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace and profile controls",
    tone: "emerald",
  },
];

export function getDashboardNavItems(isAdmin: boolean) {
  return dashboardNavItems.filter((item) => !item.adminOnly || isAdmin);
}

export function getDashboardMobileTabItems(isAdmin: boolean) {
  const preferredHrefs = isAdmin
    ? ["/dashboard", "/tenders", "/digest", "/analytics", "/settings"]
    : ["/dashboard", "/tenders", "/digest", "/settings"];

  return preferredHrefs
    .map((href) => dashboardNavItems.find((item) => item.href === href))
    .filter((item): item is DashboardNavItem => Boolean(item));
}

export function getDashboardToneClasses(tone: DashboardNavTone) {
  return dashboardToneClasses[tone];
}

