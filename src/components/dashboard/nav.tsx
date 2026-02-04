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
    <aside className="hidden md:flex w-72 flex-col border-r border-border/40 bg-gradient-to-b from-background via-background to-muted/10 min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {/* Subtle shine effect on active */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              )}
              
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                isActive 
                  ? "bg-white/20 shadow-inner" 
                  : "bg-muted/80 group-hover:bg-primary/10 group-hover:text-primary"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wide",
                        isActive 
                          ? "bg-white/20 text-white border-0" 
                          : "bg-primary/10 text-primary border-primary/20"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  "text-[11px] truncate transition-colors",
                  isActive ? "text-white/70" : "text-muted-foreground/70"
                )}>
                  {item.description}
                </p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-all duration-300",
                isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"
              )} />
            </Link>
          );
        })}
      </nav>
      
      {/* Plan Info - Premium Card */}
      {profile?.tenant && (
        <div className="p-4 border-t border-border/40">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 space-y-3 shadow-xl">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-accent/20 rounded-full blur-xl" />
            
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                {planName === "enterprise" ? (
                  <Crown className="h-5 w-5 text-white" />
                ) : (
                  <Zap className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white capitalize">{planName} Plan</p>
                <p className="text-[11px] text-slate-400">
                  {planName === "enterprise" ? "Unlimited resources" : `${limits.sources} sources max`}
                </p>
              </div>
            </div>
            
            {planName !== "enterprise" && (
              <>
                <div className="relative space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Monthly usage</span>
                    <span className="font-medium text-white">70%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: '70%' }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="relative w-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm transition-all duration-300 hover:shadow-lg" 
                  asChild
                >
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
