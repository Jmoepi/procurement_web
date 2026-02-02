"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Settings,
  Mail,
  Users,
  BarChart,
  Sparkles,
  Zap,
  ChevronRight,
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
    <aside className="hidden md:flex w-72 flex-col border-r bg-gradient-to-b from-background to-muted/20 min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                isActive 
                  ? "bg-primary-foreground/20" 
                  : "bg-muted group-hover:bg-background"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4",
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  "text-xs truncate transition-colors",
                  isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-all",
                isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"
              )} />
            </Link>
          );
        })}
      </nav>
      
      {/* Plan Info */}
      {profile?.tenant && (
        <div className="p-4 border-t bg-gradient-to-t from-muted/50">
          <div className="rounded-xl bg-background border p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize">{planName} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {planName === "enterprise" ? "Unlimited resources" : `${limits.sources} sources max`}
                  </p>
                </div>
              </div>
            </div>
            {planName !== "enterprise" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Monthly usage</span>
                    <span className="font-medium">70%</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
                <Button size="sm" className="w-full" variant="outline" asChild>
                  <Link href="/settings?tab=billing">
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Upgrade Plan
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
