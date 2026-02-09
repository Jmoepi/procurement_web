"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Settings,
  Mail,
  Users,
  BarChart,
  Zap,
  Crown,
} from "lucide-react";
import type { Profile } from "@/types";

interface DashboardNavProps {
  profile: Profile | null;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    title: "Tenders",
    href: "/tenders",
    icon: FileText,
    description: "Browse opportunities",
    badge: "New",
  },
  {
    title: "Sources",
    href: "/sources",
    icon: Globe,
    description: "Manage data sources",
    adminOnly: true,
  },
  {
    title: "Subscribers",
    href: "/subscribers",
    icon: Users,
    description: "Email recipients",
    adminOnly: true,
  },
  {
    title: "Digest",
    href: "/digest",
    icon: Mail,
    description: "Email previews",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart,
    description: "Insights & reports",
    adminOnly: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Preferences",
  },
];

export function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === "admin";

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const planName = profile?.tenant?.plan || "starter";
  const planLimits = {
    starter: { sources: 30, subscribers: 1 },
    pro: { sources: 100, subscribers: 10 },
    enterprise: { sources: 500, subscribers: 100 },
  };
  const limits = planLimits[planName as keyof typeof planLimits] || planLimits.starter;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-black/[0.04] dark:border-white/[0.06] bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 p-3 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.title}</span>
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-medium ml-auto",
                    isActive && "bg-white/20 text-white border-0"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Plan Info - Clean Card */}
      {profile?.tenant && (
        <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="rounded-xl bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                {planName === "enterprise" ? (
                  <Crown className="h-4 w-4 text-primary" />
                ) : (
                  <Zap className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{planName}</p>
                <p className="text-xs text-muted-foreground">
                  {planName === "enterprise" ? "Unlimited" : `${limits.sources} sources`}
                </p>
              </div>
            </div>
            
            {planName !== "enterprise" && (
              <Button 
                size="sm" 
                variant="outline"
                className="w-full" 
                asChild
              >
                <Link href="/settings?tab=billing">
                  Upgrade
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
