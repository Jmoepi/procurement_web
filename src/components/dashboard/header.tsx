"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  X,
  Sparkles,
  HelpCircle,
  Command,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { getInitials } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

interface DashboardHeaderProps {
  user: User;
  profile: Profile | null;
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setSearchOpen(false);
      requestAnimationFrame(() => {
        desktopSearchRef.current?.focus();
        desktopSearchRef.current?.select();
      });
      return;
    }

    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    const target = query ? `/tenders?search=${encodeURIComponent(query)}` : "/tenders";

    router.push(target);
    setSearchOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => {
        mobileSearchRef.current?.focus();
        mobileSearchRef.current?.select();
      });
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      const revealSearch = () => {
        if (window.matchMedia("(min-width: 1024px)").matches) {
          setSearchOpen(false);
          requestAnimationFrame(() => {
            desktopSearchRef.current?.focus();
            desktopSearchRef.current?.select();
          });
          return;
        }

        setSearchOpen(true);
      };

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        revealSearch();
        return;
      }

      if (!isTypingTarget && event.key === "/") {
        event.preventDefault();
        revealSearch();
        return;
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const planName = profile?.tenant?.plan || "starter";

  return (
    <header className="glass-nav sticky top-0 z-50 w-full border-b border-white/45 dark:border-white/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileNav profile={profile} />
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#06b6d4_0%,#2563eb_45%,#8b5cf6_100%)] text-white shadow-[0_18px_30px_-18px_rgba(59,130,246,0.9)] ring-1 ring-white/60">
              <Search className="h-4 w-4" />
            </div>
            <span className="hidden text-base font-semibold tracking-tight sm:block">
              Procurement <span className="text-gradient-blue">Radar</span>
            </span>
          </Link>
        </div>

        <div className="mx-4 hidden max-w-2xl flex-1 lg:block">
          <form onSubmit={handleSearchSubmit} className="group relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-sky-600 dark:group-focus-within:text-sky-300" />
            <input
              ref={desktopSearchRef}
              type="search"
              placeholder="Search tenders and jump straight into action"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-white/60 bg-white/62 px-11 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ring-offset-background placeholder:text-muted-foreground focus-visible:border-sky-400/40 focus-visible:bg-white/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/25 dark:border-white/10 dark:bg-white/[0.05] dark:focus-visible:bg-white/[0.08]"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-white/60 bg-white/75 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm sm:flex dark:border-white/10 dark:bg-white/[0.06]">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-white/45 bg-white/55 shadow-sm backdrop-blur-xl hover:bg-white/75 lg:hidden dark:border-white/10 dark:bg-white/[0.05]"
            onClick={openSearch}
          >
            <Search className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-xl border border-white/45 bg-white/55 shadow-sm backdrop-blur-xl hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.05]"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#ec4899_50%,#8b5cf6_100%)] text-[10px] font-bold text-white ring-2 ring-background">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-subtle w-80 rounded-[24px] border-border/60 shadow-[0_30px_60px_-36px_rgba(37,99,235,0.45)]">
              <DropdownMenuLabel className="flex items-center justify-between py-3">
                <span className="font-semibold">Notifications</span>
                <Badge variant="secondary" className="border-sky-500/15 bg-sky-500/10 text-[10px] font-semibold text-sky-700 dark:text-sky-200">
                  3 new
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <NotificationItem
                  title="New high-priority tender"
                  description="Courier services for Department of Health"
                  time="2 min ago"
                  isNew
                />
                <NotificationItem
                  title="Tender closing soon"
                  description="Printing services deadline in 2 days"
                  time="1 hour ago"
                  isNew
                />
                <NotificationItem
                  title="Daily digest sent"
                  description="12 tenders included in today's digest"
                  time="6 hours ago"
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center py-2.5 font-medium text-sky-700 dark:text-sky-200">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 rounded-xl border border-white/45 bg-white/55 shadow-sm backdrop-blur-xl hover:bg-white/75 sm:flex dark:border-white/10 dark:bg-white/[0.05]"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="relative h-9 w-9 rounded-full border border-white/55 bg-white/55 p-0 shadow-sm backdrop-blur-xl hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.05]" variant="ghost">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "User"} />
                  <AvatarFallback className="bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.18),rgba(251,191,36,0.18))] text-sky-700 font-semibold text-sm dark:text-sky-200">
                    {getInitials(profile?.full_name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-subtle w-64 rounded-[24px] border-border/60 shadow-[0_30px_60px_-36px_rgba(37,99,235,0.45)]" align="end" forceMount>
              <DropdownMenuLabel className="p-4 font-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-sky-500/20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.18),rgba(251,191,36,0.18))] text-sky-700 text-lg font-bold dark:text-sky-200">
                      {getInitials(profile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="max-w-[140px] truncate text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1.5 w-fit border-sky-500/20 bg-sky-500/10 text-[9px] font-semibold capitalize text-sky-700 dark:text-sky-200"
                    >
                      {planName} plan
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="mx-2 my-0.5 cursor-pointer rounded-lg">
                <Link href="/settings" className="flex items-center gap-2.5 py-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="mx-2 my-0.5 cursor-pointer rounded-lg">
                <Link href="/settings" className="flex items-center gap-2.5 py-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {planName !== "enterprise" && (
                <DropdownMenuItem asChild className="mx-2 my-0.5 cursor-pointer rounded-xl bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(168,85,247,0.1),rgba(251,191,36,0.14))] hover:bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.14),rgba(251,191,36,0.18))]">
                  <Link href="/settings" className="flex items-center gap-2.5 py-2 text-sky-700 dark:text-sky-200">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Upgrade Plan</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="mx-2 my-0.5 cursor-pointer rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {searchOpen && (
        <div className="glass-nav absolute inset-0 z-50 border-b border-white/45 lg:hidden dark:border-white/10">
          <form onSubmit={handleSearchSubmit} className="flex h-16 items-center gap-2 px-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={mobileSearchRef}
                type="search"
                placeholder="Search tenders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-white/60 bg-white/75 px-10 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] focus:outline-none focus:ring-2 focus:ring-sky-400/25 dark:border-white/10 dark:bg-white/[0.08]"
              />
            </div>
            <Button type="submit" className="rounded-2xl px-4">
              Go
            </Button>
            <Button
              variant="ghost"
              type="button"
              size="icon"
              className="rounded-2xl border border-white/45 bg-white/60 dark:border-white/10 dark:bg-white/[0.05]"
              onClick={closeSearch}
            >
              <X className="h-5 w-5" />
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}

function NotificationItem({
  title,
  description,
  time,
  isNew,
}: {
  title: string;
  description: string;
  time: string;
  isNew?: boolean;
}) {
  return (
    <div className={`cursor-pointer px-4 py-3 transition-colors hover:bg-white/55 dark:hover:bg-white/[0.04] ${isNew ? "bg-sky-500/6" : ""}`}>
      <div className="flex items-start gap-3">
        {isNew && (
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[linear-gradient(135deg,#06b6d4_0%,#8b5cf6_100%)] ring-2 ring-sky-500/15" />
        )}
        <div className={`flex-1 ${!isNew ? "ml-5" : ""}`}>
          <p className="text-sm font-medium">{title}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/70">{time}</p>
        </div>
      </div>
    </div>
  );
}

