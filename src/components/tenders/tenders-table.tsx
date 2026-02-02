"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, ChevronLeft, ChevronRight, FileText, Clock, Calendar } from "lucide-react";
import { formatDateShort, getCategoryColor, getPriorityColor, formatDaysRemaining, truncateText } from "@/lib/utils";
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
      <div className="p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          No tenders found
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table View */}
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
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {truncateText(tender.title, 60)}
                  </Link>
                  {tender.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
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
                      <span className={`text-sm font-medium ${
                        tender.days_remaining != null && (tender.days_remaining ?? 0) <= 3
                          ? "text-red-500"
                          : tender.days_remaining != null && (tender.days_remaining ?? 0) <= 7
                          ? "text-orange-500"
                          : ""
                      }`}>
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
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                  >
                    <a
                      href={tender.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-1">
        {tenders.map((tender, index) => (
          <MobileTenderCard key={tender.id} tender={tender} index={index} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t mt-4">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Showing {(currentPage - 1) * 20 + 1} to{" "}
          {Math.min(currentPage * 20, totalCount)} of {totalCount} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-9"
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="flex items-center gap-1">
            {/* Show page numbers on mobile */}
            {totalPages <= 5 ? (
              [...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(i + 1)}
                  className="h-9 w-9 p-0"
                >
                  {i + 1}
                </Button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-9"
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
  index 
}: { 
  tender: Tender & { source: { name: string; url: string } | null };
  index: number;
}) {
  const isUrgent = tender.days_remaining != null && tender.days_remaining <= 3;
  const isClosingSoon = tender.days_remaining != null && tender.days_remaining <= 7;
  
  return (
    <Card 
      className={`p-4 animate-fade-in ${
        isUrgent ? 'border-red-500/30 bg-red-500/5' : 
        isClosingSoon ? 'border-orange-500/20' : ''
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="space-y-3">
        {/* Header with badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`${getCategoryColor(tender.category)} text-[10px]`}>
              {tender.category}
            </Badge>
            <Badge className={`${getPriorityColor(tender.priority)} text-[10px]`}>
              {tender.priority}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <a href={tender.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Title */}
        <Link 
          href={`/tenders/${tender.id}`}
          className="block font-medium text-sm hover:text-primary transition-colors line-clamp-2"
        >
          {tender.title}
        </Link>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate max-w-[150px]">
            {tender.source?.name ?? "Unknown source"}
          </span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDateShort(tender.first_seen)}</span>
          </div>
        </div>

        {/* Deadline */}
        {tender.closing_at && (
          <div className={`flex items-center justify-between pt-2 border-t ${
            isUrgent ? 'text-red-500' : isClosingSoon ? 'text-orange-500' : ''
          }`}>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className={`h-3.5 w-3.5 ${isUrgent ? 'text-red-500' : isClosingSoon ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <span>Closes: {formatDateShort(tender.closing_at)}</span>
            </div>
            <span className={`text-xs font-semibold ${
              isUrgent ? 'text-red-500' : isClosingSoon ? 'text-orange-500' : 'text-muted-foreground'
            }`}>
              {formatDaysRemaining(tender.days_remaining)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
