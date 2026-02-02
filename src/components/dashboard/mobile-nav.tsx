"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Menu,
  Search,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { Profile } from "@/types";

interface MobileNavProps {
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

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === "admin";

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden relative overflow-hidden group"
        >
          <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Search className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">Procurement Radar</SheetTitle>
              <p className="text-xs text-muted-foreground">South Africa 🇿🇦</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-88px)]">
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
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
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                  )} />
                </Link>
              );
            })}
          </nav>

          {/* Plan Info */}
          <div className="p-4 border-t bg-gradient-to-t from-muted/50">
            <div className="rounded-xl bg-background border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{planName} Plan</p>
                    <p className="text-xs text-muted-foreground">
                      {planName === "enterprise" ? "Unlimited" : `${limits.sources} sources`}
                    </p>
                  </div>
                </div>
                {planName !== "enterprise" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <Link href="/settings">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Upgrade
                    </Link>
                  </Button>
                )}
              </div>
              {planName !== "enterprise" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium">70%</span>
                  </div>
                  <Progress value={70} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
