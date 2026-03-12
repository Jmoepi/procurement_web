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

export type DashboardNavItem = {
  title: string;
  shortTitle: string;
  href: string;
  icon: LucideIcon;
  description: string;
  adminOnly?: boolean;
  badge?: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    title: "Dashboard",
    shortTitle: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and daily signals",
  },
  {
    title: "Tenders",
    shortTitle: "Tenders",
    href: "/tenders",
    icon: FileText,
    description: "Browse live opportunities",
    badge: "Live",
  },
  {
    title: "Sources",
    shortTitle: "Sources",
    href: "/sources",
    icon: Globe,
    description: "Manage monitored portals",
    adminOnly: true,
  },
  {
    title: "Subscribers",
    shortTitle: "People",
    href: "/subscribers",
    icon: Users,
    description: "Control digest recipients",
    adminOnly: true,
  },
  {
    title: "Digest",
    shortTitle: "Digest",
    href: "/digest",
    icon: Mail,
    description: "Review outbound emails",
  },
  {
    title: "Analytics",
    shortTitle: "Analytics",
    href: "/analytics",
    icon: BarChart,
    description: "Track trends and performance",
    adminOnly: true,
  },
  {
    title: "Settings",
    shortTitle: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace and profile controls",
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
