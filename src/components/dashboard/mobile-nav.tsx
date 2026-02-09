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
      <SheetContent side="left" className="w-[280px] p-0 border-r border-black/[0.04] dark:border-white/[0.06]">
        <SheetHeader className="p-5 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <SheetTitle className="text-base font-semibold">Procurement Radar</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-72px)]">
          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {filteredItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

          {/* Plan Info */}
          <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.06]">
            <div className="rounded-xl bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{planName}</p>
                  <p className="text-xs text-muted-foreground">
                    {planName === "enterprise" ? "Unlimited" : `${limits.sources} sources`}
                  </p>
                </div>
              </div>
              {planName !== "enterprise" && (
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link href="/settings">
                    Upgrade
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
