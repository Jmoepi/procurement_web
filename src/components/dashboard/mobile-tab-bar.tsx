"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { getDashboardMobileTabItems } from "./navigation";

interface DashboardMobileTabBarProps {
  profile: Profile | null;
}

export function DashboardMobileTabBar({
  profile,
}: DashboardMobileTabBarProps) {
  const pathname = usePathname();
  const items = getDashboardMobileTabItems(profile?.role === "admin");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="glass mx-auto flex max-w-xl items-center justify-between rounded-[24px] border border-border/60 px-2 py-2 shadow-2xl shadow-black/[0.08]">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.shortTitle}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
