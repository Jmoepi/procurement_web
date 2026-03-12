"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  formatDateShort,
  formatDaysRemaining,
  getCategoryColor,
  getPriorityColor,
  truncateText,
} from "@/lib/utils";
import type { Tender } from "@/types";

interface TendersTableProps {
  tenders: (Tender & { source: { name: string; url: string } | null })[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function TendersTable({
  tenders,
  totalCount,
  currentPage,
  totalPages,
}: TendersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (tenders.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">No tenders found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {totalCount.toLocaleString()} live opportunities
          </p>
          <p className="text-xs text-muted-foreground">
            Sorted by newest discoveries across your monitored sources.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs font-medium"
        >
          Page {currentPage} of {totalPages}
        </Badge>
      </div>

      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Closing</TableHead>
              <TableHead>Found</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenders.map((tender, index) => (
              <TableRow
                key={tender.id}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <Link
                    href={`/tenders/${tender.id}`}
                    className="font-medium transition-colors hover:text-primary"
                  >
                    {truncateText(tender.title, 60)}
                  </Link>
                  {tender.summary && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {tender.summary}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{tender.source?.name ?? "Unknown"}</span>
                </TableCell>
                <TableCell>
                  <Badge className={getCategoryColor(tender.category)}>
                    {tender.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(tender.priority)}>
                    {tender.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tender.closing_at ? (
                    <div>
                      <span
                        className={`text-sm font-medium ${
                          tender.days_remaining != null && tender.days_remaining <= 3
                            ? "text-red-500"
                            : tender.days_remaining != null && tender.days_remaining <= 7
                              ? "text-orange-500"
                              : ""
                        }`}
                      >
                        {formatDaysRemaining(tender.days_remaining)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(tender.closing_at)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No deadline</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDateShort(tender.first_seen)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="opacity-50 transition-opacity group-hover:opacity-100"
                  >
                    <a href={tender.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 px-1 py-4 lg:hidden">
        {tenders.map((tender, index) => (
          <MobileTenderCard key={tender.id} tender={tender} index={index} />
        ))}
      </div>

      <div className="mt-2 flex flex-col items-center justify-between gap-4 border-t border-border/60 px-4 py-4 sm:flex-row">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalCount)} of{" "}
          {totalCount} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-9 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="flex items-center gap-1">
            {totalPages <= 5 ? (
              [...Array(totalPages)].map((_, index) => (
                <Button
                  key={index + 1}
                  variant={currentPage === index + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(index + 1)}
                  className="h-9 w-9 rounded-xl p-0"
                >
                  {index + 1}
                </Button>
              ))
            ) : (
              <span className="px-2 text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-9 rounded-xl"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MobileTenderCard({
  tender,
  index,
}: {
  tender: Tender & { source: { name: string; url: string } | null };
  index: number;
}) {
  const isUrgent = tender.days_remaining != null && tender.days_remaining <= 3;
  const isClosingSoon = tender.days_remaining != null && tender.days_remaining <= 7;

  return (
    <Card
      className={`animate-fade-in overflow-hidden rounded-[24px] border-border/60 p-4 shadow-sm ${
        isUrgent
          ? "border-red-500/30 bg-red-500/5"
          : isClosingSoon
            ? "border-orange-500/20"
            : ""
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`${getCategoryColor(tender.category)} text-[10px]`}>
              {tender.category}
            </Badge>
            <Badge className={`${getPriorityColor(tender.priority)} text-[10px]`}>
              {tender.priority}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl" asChild>
            <a href={tender.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <Link
          href={`/tenders/${tender.id}`}
          className="block line-clamp-2 text-sm font-semibold leading-6 transition-colors hover:text-primary"
        >
          {tender.title}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="max-w-[150px] truncate">{tender.source?.name ?? "Unknown source"}</span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDateShort(tender.first_seen)}</span>
          </div>
        </div>

        {tender.closing_at && (
          <div
            className={`flex items-center justify-between border-t border-border/60 pt-2 ${
              isUrgent ? "text-red-500" : isClosingSoon ? "text-orange-500" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <Clock
                className={`h-3.5 w-3.5 ${
                  isUrgent
                    ? "text-red-500"
                    : isClosingSoon
                      ? "text-orange-500"
                      : "text-muted-foreground"
                }`}
              />
              <span>Closes: {formatDateShort(tender.closing_at)}</span>
            </div>
            <span
              className={`text-xs font-semibold ${
                isUrgent
                  ? "text-red-500"
                  : isClosingSoon
                    ? "text-orange-500"
                    : "text-muted-foreground"
              }`}
            >
              {formatDaysRemaining(tender.days_remaining)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
