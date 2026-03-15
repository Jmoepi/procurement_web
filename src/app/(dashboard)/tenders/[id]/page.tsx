import { createClient } from "@/lib/supabase/server";
import { getTenderDetailById } from "@/lib/tender-queries";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, Clock, Globe, FileText, ChevronRight, AlertTriangle, Share2, Bookmark } from "lucide-react";
import { formatDate, formatDateTime, getCategoryColor, getPriorityColor, formatDaysRemaining } from "@/lib/utils";

interface TenderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenderDetailPage({ params }: TenderDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  const { data: tender, error } = await getTenderDetailById(
    supabase,
    profile?.tenant_id ?? "",
    id
  );

  if (error || !tender) {
    notFound();
  }

  const isUrgent = tender.days_remaining != null && tender.days_remaining <= 3;
  const isClosingSoon = tender.days_remaining != null && tender.days_remaining <= 7;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb / Back - Mobile optimized */}
      <div className="flex items-center justify-between">
        <Link href="/tenders">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Tenders</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Urgent Banner */}
      {isUrgent && !tender.expired && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse-soft">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="font-medium text-red-600 dark:text-red-400">Urgent: Closing Soon</p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              This tender closes in {formatDaysRemaining(tender.days_remaining)}
            </p>
          </div>
        </div>
      )}

      {/* Header - Mobile optimized */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getCategoryColor(tender.category)}>
            {tender.category}
          </Badge>
          <Badge className={getPriorityColor(tender.priority)}>
            {tender.priority} priority
          </Badge>
          {tender.expired && (
            <Badge variant="destructive">Expired</Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tender.title}</h1>
        {tender.summary && (
          <p className="text-base sm:text-lg text-muted-foreground">{tender.summary}</p>
        )}
      </div>

      {/* Mobile Action Buttons - Sticky */}
      <div className="lg:hidden flex gap-2 sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b">
        <Button asChild className="flex-1 h-11">
          <a href={tender.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Tender
          </a>
        </Button>
        {tender.source?.url && (
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" asChild>
            <a href={tender.source.url} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      {/* Quick Stats - Scrollable on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className={`${isUrgent ? 'border-red-500/30' : isClosingSoon ? 'border-orange-500/20' : ''}`}>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Closing Date</span>
              <span className="sm:hidden">Closes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {tender.closing_at ? (
              <div>
                <p className={`text-base sm:text-lg font-semibold ${
                  isUrgent ? 'text-red-500' : isClosingSoon ? 'text-orange-500' : ''
                }`}>
                  {formatDaysRemaining(tender.days_remaining)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">{formatDate(tender.closing_at)}</p>
              </div>
            ) : (
              <p className="text-base text-muted-foreground">No deadline</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-base sm:text-lg font-semibold truncate">{tender.source?.name ?? "Unknown"}</p>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{tender.source?.type}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">First Seen</span>
              <span className="sm:hidden">Found</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-base sm:text-lg font-semibold">{formatDate(tender.first_seen)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{formatDateTime(tender.first_seen)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-base sm:text-lg font-semibold">{tender.documents?.length ?? 0}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">attached</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Desktop Actions */}
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>View the original tender posting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button asChild>
                  <a href={tender.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Original Posting
                  </a>
                </Button>
                {tender.source?.url && (
                  <Button variant="outline" asChild>
                    <a href={tender.source.url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Source Website
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Raw Content */}
          {tender.raw_content && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Tender Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Extracted content from the tender posting</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-xs sm:text-sm bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-h-[400px] sm:max-h-[600px]">
                    {tender.raw_content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {tender.documents && tender.documents.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Documents</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Attached files and documents</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  {tender.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.filename ?? "Document"}</p>
                          <p className="text-xs text-muted-foreground uppercase">{doc.doc_type}</p>
                        </div>
                      </div>
                      {doc.storage_path && (
                        <Button variant="ghost" size="sm" className="shrink-0" asChild>
                          <a href={doc.storage_path} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Collapsible on mobile */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tender ID</p>
                  <p className="text-xs sm:text-sm font-mono truncate">{tender.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Last Seen</p>
                  <p className="text-xs sm:text-sm">{formatDate(tender.last_seen)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                  <p className="text-xs sm:text-sm">{formatDate(tender.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Hash</p>
                  <p className="text-xs sm:text-sm font-mono truncate">{tender.content_hash?.slice(0, 12)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Tenders - Placeholder */}
          <Card className="hidden lg:block">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Similar Tenders</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Other opportunities you might like</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-powered recommendations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
