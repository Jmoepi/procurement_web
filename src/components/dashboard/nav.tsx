"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { Profile } from "@/types";
import { getDashboardNavItems } from "./navigation";

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
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[280px] shrink-0 md:flex">
      <div className="flex w-full flex-col px-4 py-5">
        <div className="card-glass flex h-full flex-col rounded-[28px] p-3">
          <div className="rounded-[22px] bg-gradient-to-br from-primary/14 via-primary/6 to-transparent p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {tenantName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Manage sources, recipients, and reporting from one place."
                : "Track opportunities, deadlines, and digest activity."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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

          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200",
                      isActive
                        ? "bg-white/15"
                        : "bg-background/80 text-foreground shadow-sm group-hover:bg-background"
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

          <div className="mt-4 rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
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

            {planName !== "enterprise" ? (
              <>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Upgrade when you need broader monitoring, more recipients, and
                  admin controls.
                </p>
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
