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
import { getDashboardNavItems, getDashboardToneClasses } from "./navigation";
import { getRoleLabel, hasAdminAccess } from "@/lib/roles";

interface MobileNavProps {
  profile: Profile | null;
}

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = hasAdminAccess(profile?.role);

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
          className="group relative overflow-hidden rounded-xl border border-white/45 bg-white/55 shadow-sm backdrop-blur-xl hover:bg-white/75 md:hidden dark:border-white/10 dark:bg-white/[0.05]"
        >
          <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[320px] max-w-[92vw] border-r border-white/50 bg-background/92 p-0 backdrop-blur-2xl dark:border-white/10"
      >
        <SheetHeader className="border-b border-white/40 px-5 pb-4 pt-5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#06b6d4_0%,#2563eb_45%,#8b5cf6_100%)] text-white shadow-[0_18px_30px_-18px_rgba(59,130,246,0.85)]">
              <Search className="h-4 w-4" />
            </div>
            <SheetTitle className="text-base font-semibold">
              Procurement <span className="text-gradient-blue">Radar</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-72px)] flex-col">
          <div className="px-4 pt-4">
            <div className="rounded-[24px] border border-white/55 bg-[linear-gradient(140deg,rgba(14,165,233,0.16),rgba(168,85,247,0.1)_48%,rgba(251,191,36,0.14))] p-4 shadow-[0_26px_60px_-42px_rgba(37,99,235,0.55)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600/85 dark:text-slate-200/70">
                Workspace
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                {tenantName}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-200"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {`${getRoleLabel(profile?.role)} access`}
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 text-[11px] font-medium capitalize text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/18 dark:text-sky-200"
                >
                  {planName} plan
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const tone = getDashboardToneClasses(item.tone);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[22px] border border-transparent px-3 py-3 text-sm transition-all duration-200",
                    isActive
                      ? tone.activeItem
                      : cn("text-muted-foreground", tone.inactiveItem)
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200",
                      isActive ? tone.activeIcon : tone.inactiveIcon
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
                            isActive ? "border-0 bg-white/15 text-white" : tone.badge
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        isActive ? "text-white/80" : "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/40 p-3 dark:border-white/10">
            <div className="glass-subtle rounded-[24px] p-4 shadow-[0_20px_45px_-34px_rgba(168,85,247,0.45)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.16),rgba(250,204,21,0.18))] text-sky-700 dark:text-sky-200">
                  {planName === "enterprise" ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <Zap className="h-5 w-5" />
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
                  className="mt-4 w-full rounded-xl border-white/60 bg-white/70"
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

