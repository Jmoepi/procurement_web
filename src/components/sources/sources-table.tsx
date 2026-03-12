"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ExternalLink, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import type { Source } from "@/types";

interface SourcesTableProps {
  sources: Source[];
}

export function SourcesTable({ sources }: SourcesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const toggleEnabled = async (source: Source) => {
    setLoadingId(source.id);
    try {
      const { error } = await supabase
        .from("sources")
        .update({ enabled: !source.enabled })
        .eq("id", source.id);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update source");
    } finally {
      setLoadingId(null);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    
    setLoadingId(id);
    try {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Source deleted", {
        description: "The source has been removed.",
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete source");
    } finally {
      setLoadingId(null);
    }
  };

  if (sources.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No sources configured yet. Add your first source to start monitoring tenders.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Last Crawled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source) => (
          <TableRow key={source.id}>
            <TableCell>
              <div>
                <p className="font-medium">{source.name}</p>
                <p className="text-sm text-muted-foreground truncate max-w-xs">
                  {source.url}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {source.type}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {source.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {source.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{source.tags.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              {source.last_crawled_at ? (
                <span className="text-sm">{formatDateShort(source.last_crawled_at)}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Never</span>
              )}
            </TableCell>
            <TableCell>
              {source.last_crawl_status ? (
                <Badge
                  variant={source.last_crawl_status === "success" ? "success" : "destructive"}
                >
                  {source.last_crawl_status}
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </TableCell>
            <TableCell>
              <Switch
                checked={source.enabled}
                onCheckedChange={() => toggleEnabled(source)}
                disabled={loadingId === source.id}
              />
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Source
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
