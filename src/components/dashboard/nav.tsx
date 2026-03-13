"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { Profile } from "@/types";
import { getDashboardNavItems, getDashboardToneClasses } from "./navigation";

interface DashboardNavProps {
  profile: Profile | null;
}

export function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === "admin";
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
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[290px] shrink-0 md:flex">
      <div className="flex w-full flex-col px-4 py-5">
        <div className="card-glass flex h-full flex-col rounded-[30px] p-3">
          <div className="rounded-[24px] border border-white/55 bg-[linear-gradient(140deg,rgba(14,165,233,0.16),rgba(168,85,247,0.1)_48%,rgba(251,191,36,0.14))] p-4 shadow-[0_26px_60px_-42px_rgba(37,99,235,0.55)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600/85 dark:text-slate-200/70">
              Workspace
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {tenantName}
            </h2>
            <p className="mt-1 text-sm text-slate-700/80 dark:text-slate-200/75">
              {isAdmin
                ? "Manage sources, recipients, and reporting from one place."
                : "Track opportunities, deadlines, and digest activity."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="gap-1 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-200"
              >
                <ShieldCheck className="h-3 w-3" />
                {isAdmin ? "Admin access" : "Member access"}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 text-[11px] font-medium capitalize text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/18 dark:text-sky-200"
              >
                {planName} plan
              </Badge>
            </div>
          </div>

          <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const tone = getDashboardToneClasses(item.tone);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-[22px] border border-transparent px-3 py-3 text-sm transition-all duration-200",
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

          <div className="glass-subtle mt-4 rounded-[24px] p-4 shadow-[0_20px_45px_-34px_rgba(168,85,247,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.16),rgba(250,204,21,0.18))] text-sky-700 dark:text-sky-200">
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

            {planName !== "enterprise" ? (
              <>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Upgrade when you need broader monitoring, more recipients, and
                  admin controls.
                </p>
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
              </>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Enterprise mode is active with your highest workspace limits and
                reporting access unlocked.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

