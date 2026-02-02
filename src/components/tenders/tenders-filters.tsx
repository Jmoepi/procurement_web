"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export function TendersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
      
      // Reset page when filters change
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push(pathname);
    });
    setMobileFiltersOpen(false);
  };

  // Count active filters (excluding search)
  const filterCount = [
    searchParams.get("category"),
    searchParams.get("priority"),
    searchParams.get("expired") === "true" ? "expired" : null,
  ].filter(Boolean).length;

  const hasFilters = searchParams.size > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar - Always visible */}
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button type="submit" disabled={isPending} className="h-10 shrink-0">
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>

        {/* Mobile Filter Button */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 lg:hidden relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {filterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {filterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filter Tenders</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-6">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={searchParams.get("category") ?? "all"}
                  onValueChange={(value) => handleFilterChange("category", value)}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="printing">Printing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={searchParams.get("priority") ?? "all"}
                  onValueChange={(value) => handleFilterChange("priority", value)}
                >
                  <SelectTrigger className="w-full h-11">
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

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={searchParams.get("expired") ?? "false"}
                  onValueChange={(value) => handleFilterChange("expired", value)}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Active Only" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Active Only</SelectItem>
                    <SelectItem value="true">Include Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
                <SheetClose asChild>
                  <Button className="flex-1">
                    Apply Filters
                  </Button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:flex lg:items-center lg:gap-3">
        {/* Category Filter */}
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="courier">Courier</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={searchParams.get("priority") ?? "all"}
          onValueChange={(value) => handleFilterChange("priority", value)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Show Expired Toggle */}
        <Select
          value={searchParams.get("expired") ?? "false"}
          onValueChange={(value) => handleFilterChange("expired", value)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Active Only</SelectItem>
            <SelectItem value="true">Include Expired</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Pills (Mobile) */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 lg:hidden">
          {searchParams.get("search") && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              Search: {searchParams.get("search")?.slice(0, 15)}{searchParams.get("search")!.length > 15 && "..."}
              <button
                onClick={() => {
                  setSearch("");
                  handleFilterChange("search", null);
                }}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("category") && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              {searchParams.get("category")}
              <button
                onClick={() => handleFilterChange("category", null)}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("priority") && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              {searchParams.get("priority")} priority
              <button
                onClick={() => handleFilterChange("priority", null)}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("expired") === "true" && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              Showing expired
              <button
                onClick={() => handleFilterChange("expired", "false")}
                className="hover:bg-muted rounded-full p-0.5"
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
