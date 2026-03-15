"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { getDashboardMobileTabItems, getDashboardToneClasses } from "./navigation";
import { hasAdminAccess } from "@/lib/roles";

interface DashboardMobileTabBarProps {
  profile: Profile | null;
}

export function DashboardMobileTabBar({
  profile,
}: DashboardMobileTabBarProps) {
  const pathname = usePathname();
  const items = getDashboardMobileTabItems(hasAdminAccess(profile?.role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="glass mx-auto flex max-w-xl items-center justify-between gap-1 rounded-[28px] border border-white/55 px-2 py-2 shadow-[0_28px_60px_-36px_rgba(37,99,235,0.5)]">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const tone = getDashboardToneClasses(item.tone);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[22px] px-2 py-2 text-[11px] font-medium transition-all duration-200",
                isActive
                  ? tone.activeItem
                  : cn("text-muted-foreground", tone.inactiveItem)
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-2xl border transition-all duration-200",
                  isActive ? tone.activeIcon : tone.inactiveIcon
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </div>
              <span className="truncate">{item.shortTitle}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

