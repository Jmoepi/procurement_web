"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const supabase = createClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const planName = profile?.tenant?.plan || "starter";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left side - Logo and mobile nav */}
        <div className="flex items-center gap-3">
          <MobileNav profile={profile} />
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40 group-hover:scale-105">
              <Search className="h-4 w-4 text-primary-foreground" />
              {/* Subtle shine effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold tracking-tight">
                Procurement Radar
              </span>
              <span className="hidden lg:inline text-lg font-bold text-muted-foreground"> SA</span>
            </div>
          </Link>
        </div>

        {/* Center - Search (desktop) */}
        <div className="flex-1 max-w-xl mx-4 hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="search"
              placeholder="Search tenders, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl border border-border/60 bg-muted/30 px-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-background focus-visible:border-primary/30 transition-all duration-300"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/60">
              <Command className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">K</span>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-9 w-9 rounded-xl hover:bg-muted/60"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-muted/60">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/80 text-[10px] font-bold text-primary-foreground flex items-center justify-center ring-2 ring-background">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl border-border/60 shadow-xl">
              <DropdownMenuLabel className="flex items-center justify-between py-3">
                <span className="font-semibold">Notifications</span>
                <Badge variant="secondary" className="text-[10px] font-semibold">3 new</Badge>
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
              <DropdownMenuItem className="justify-center text-primary cursor-pointer font-medium py-2.5">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 rounded-xl hover:bg-muted/60">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border/60 hover:ring-primary/40 transition-all duration-300">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                    {getInitials(profile?.full_name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl border-border/60 shadow-xl" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-border/60">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-bold">
                      {getInitials(profile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate max-w-[140px]">
                      {user.email}
                    </p>
                    <Badge 
                      variant="outline" 
                      className="w-fit text-[9px] mt-1.5 capitalize font-semibold bg-primary/5 border-primary/20 text-primary"
                    >
                      {planName} plan
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-2 my-0.5">
                <Link href="/settings" className="flex items-center gap-2.5 py-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-2 my-0.5">
                <Link href="/settings" className="flex items-center gap-2.5 py-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {planName !== "enterprise" && (
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-2 my-0.5 bg-primary/5 hover:bg-primary/10">
                  <Link href="/settings" className="flex items-center gap-2.5 py-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Upgrade Plan</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 py-2.5 rounded-lg mx-2 my-0.5"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="absolute inset-0 z-50 bg-background lg:hidden">
          <div className="flex items-center h-16 px-4 gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search tenders..."
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border-0 bg-muted px-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-xl"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function NotificationItem({ 
  title, 
  description, 
  time, 
  isNew 
}: { 
  title: string; 
  description: string; 
  time: string; 
  isNew?: boolean;
}) {
  return (
    <div className={`px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors ${isNew ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        {isNew && (
          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-primary to-primary/70 mt-1.5 shrink-0 ring-2 ring-primary/20" />
        )}
        <div className={`flex-1 ${!isNew ? 'ml-5' : ''}`}>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
}
