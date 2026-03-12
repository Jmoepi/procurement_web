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
import { Crown, Menu, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { Profile } from "@/types";
import { getDashboardNavItems } from "./navigation";

interface MobileNavProps {
  profile: Profile | null;
}

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === "admin";

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const filteredItems = getDashboardNavItems(isAdmin);

  const planName = profile?.tenant?.plan || "starter";
  const planLimits = {
    starter: { sources: 30, subscribers: 1 },
    pro: { sources: 100, subscribers: 10 },
    enterprise: { sources: 500, subscribers: 100 },
  };
  const limits = planLimits[planName as keyof typeof planLimits] || planLimits.starter;

  const tenantName = profile?.tenant?.name || "Your workspace";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="group relative overflow-hidden rounded-xl hover:bg-muted/60 md:hidden"
        >
          <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[320px] max-w-[92vw] border-r border-black/[0.04] p-0 dark:border-white/[0.06]"
      >
        <SheetHeader className="border-b border-black/[0.04] px-5 pb-4 pt-5 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <SheetTitle className="text-base font-semibold">Procurement Radar</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-72px)] flex-col">
          <div className="px-4 pt-4">
            <div className="rounded-[24px] bg-gradient-to-br from-primary/14 via-primary/6 to-transparent p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Workspace
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">
                {tenantName}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-medium"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {isAdmin ? "Admin access" : "Member access"}
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium capitalize text-primary"
                >
                  {planName} plan
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                      isActive ? "bg-white/15" : "bg-background/80 shadow-sm"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isActive
                              ? "border-0 bg-white/15 text-white"
                              : "border-border/60 bg-background/70 text-muted-foreground"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-black/[0.04] p-3 dark:border-white/[0.06]">
            <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                  {planName === "enterprise" ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Zap className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize">{planName}</p>
                  <p className="text-xs text-muted-foreground">
                    {planName === "enterprise"
                      ? "Unlimited monitoring"
                      : `${limits.sources} sources · ${limits.subscribers} subscribers`}
                  </p>
                </div>
              </div>
              {planName !== "enterprise" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full rounded-xl border-border/60"
                  asChild
                >
                  <Link href="/settings?tab=billing">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Review plan
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
