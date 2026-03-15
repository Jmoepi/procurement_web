"use client";

import { useCallback, useState, useTransition, type ComponentType, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getTenderCategoryLabel,
  TENDER_CATEGORY_FILTER_OPTIONS,
} from "@/lib/tender-categories";
import { cn } from "@/lib/utils";
import { Clock3, Filter, Flame, Printer, Search, Truck, X } from "lucide-react";

export function TendersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isClosingSoon = searchParams.get("closing_soon") === "true";
  const isHighPriority = searchParams.get("priority") === "high";
  const isCourier = searchParams.get("category") === "courier";
  const isPrinting = searchParams.get("category") === "printing";

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "all") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      if (!params.page) {
        newParams.delete("page");
      }

      return newParams.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string | null) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ [key]: value })}`);
    });
  };

  const handleQuickToggle = (key: string, active: boolean, value: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ [key]: active ? null : value })}`);
    });
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    handleFilterChange("search", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push(pathname);
    });
    setMobileFiltersOpen(false);
  };

  const filterCount = [
    searchParams.get("category"),
    searchParams.get("priority"),
    searchParams.get("expired") === "true" ? "expired" : null,
    isClosingSoon ? "closing_soon" : null,
  ].filter(Boolean).length;

  const hasFilters = searchParams.size > 0;
  const quickFilters = [
    {
      label: "Closing soon",
      icon: Clock3,
      active: isClosingSoon,
      onClick: () => handleQuickToggle("closing_soon", isClosingSoon, "true"),
    },
    {
      label: "High priority",
      icon: Flame,
      active: isHighPriority,
      onClick: () => handleQuickToggle("priority", isHighPriority, "high"),
    },
    {
      label: "Courier",
      icon: Truck,
      active: isCourier,
      onClick: () => handleQuickToggle("category", isCourier, "courier"),
    },
    {
      label: "Printing",
      icon: Printer,
      active: isPrinting,
      onClick: () => handleQuickToggle("category", isPrinting, "printing"),
    },
  ];

  return (
    <div className="rounded-[28px] border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, keyword, or issuer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-2xl border-border/60 bg-muted/20 pl-9"
            />
          </div>
          <Button type="submit" disabled={isPending} className="h-11 shrink-0 rounded-2xl px-4">
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative h-11 rounded-2xl border-border/60 lg:hidden">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {filterCount > 0 && (
                <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-[10px]">
                  {filterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filter Tenders</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>Quick views</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickFilters.map((filter) => (
                    <QuickFilterButton
                      key={filter.label}
                      active={filter.active}
                      icon={filter.icon}
                      label={filter.label}
                      onClick={filter.onClick}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={searchParams.get("category") ?? "all"}
                  onValueChange={(value) => handleFilterChange("category", value)}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {TENDER_CATEGORY_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={searchParams.get("priority") ?? "all"}
                  onValueChange={(value) => handleFilterChange("priority", value)}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={searchParams.get("expired") ?? "false"}
                  onValueChange={(value) => handleFilterChange("expired", value)}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue placeholder="Active Only" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Active Only</SelectItem>
                    <SelectItem value="true">Include Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 border-t pt-4">
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters} className="flex-1 rounded-2xl">
                    <X className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                )}
                <SheetClose asChild>
                  <Button className="flex-1 rounded-2xl">Apply Filters</Button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {quickFilters.map((filter) => (
          <QuickFilterButton
            key={filter.label}
            active={filter.active}
            icon={filter.icon}
            label={filter.label}
            onClick={filter.onClick}
          />
        ))}
      </div>

      <div className="mt-4 hidden flex-wrap items-center gap-3 lg:flex">
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="h-10 w-[170px] rounded-2xl border-border/60">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TENDER_CATEGORY_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("priority") ?? "all"}
          onValueChange={(value) => handleFilterChange("priority", value)}
        >
          <SelectTrigger className="h-10 w-[170px] rounded-2xl border-border/60">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("expired") ?? "false"}
          onValueChange={(value) => handleFilterChange("expired", value)}
        >
          <SelectTrigger className="h-10 w-[170px] rounded-2xl border-border/60">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Active Only</SelectItem>
            <SelectItem value="true">Include Expired</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="rounded-2xl text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
          {searchParams.get("search") && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              Search: {searchParams.get("search")?.slice(0, 15)}
              {searchParams.get("search")!.length > 15 && "..."}
              <button
                onClick={() => {
                  setSearch("");
                  handleFilterChange("search", null);
                }}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("category") && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              {getTenderCategoryLabel(searchParams.get("category") ?? "")}
              <button
                onClick={() => handleFilterChange("category", null)}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("priority") && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              {searchParams.get("priority")} priority
              <button
                onClick={() => handleFilterChange("priority", null)}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {isClosingSoon && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              Closing soon
              <button
                onClick={() => handleFilterChange("closing_soon", null)}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("expired") === "true" && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              Showing expired
              <button
                onClick={() => handleFilterChange("expired", "false")}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function QuickFilterButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-2xl border border-border/60 bg-background/80 px-3 text-sm font-medium transition-all duration-200",
        active
          ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
