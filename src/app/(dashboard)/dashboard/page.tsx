import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Globe,
  Mail,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatDateShort, getCategoryColor, getPriorityColor, formatDaysRemaining } from "@/lib/utils";
import type { Tender, TenantStats } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get user profile
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user?.id ?? "")
    .single();

  // Get tenant stats
  const { data: stats } = await supabase
    .from("tenant_stats")
    .select("*")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .single() as { data: TenantStats | null };

  // Get recent tenders
  const { data: recentTenders } = await supabase
    .from("tenders")
    .select("*, source:sources(name)")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .eq("expired", false)
    .order("first_seen", { ascending: false })
    .limit(5) as { data: (Tender & { source: { name: string } | null })[] | null };

  // Get high priority tenders
  const { data: highPriorityTenders } = await supabase
    .from("tenders")
    .select("*")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .eq("priority", "high")
    .eq("expired", false)
    .order("closing_at", { ascending: true })
    .limit(5) as { data: Tender[] | null };

  // Get closing soon tenders
  const { data: closingSoonTenders } = await supabase
    .from("tenders")
    .select("*")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .eq("expired", false)
    .gte("days_remaining", 0)
    .lte("days_remaining", 7)
    .order("days_remaining", { ascending: true })
    .limit(5) as { data: Tender[] | null };

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header - Enhanced with gradient accent */}
      <div className="relative">
        {/* Decorative gradient background */}
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 font-medium">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s your procurement overview for today.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" asChild>
              <Link href="/digest">
                <Mail className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Preview</span> Digest
              </Link>
            </Button>
            <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" asChild>
              <Link href="/tenders">
                <Sparkles className="h-4 w-4 mr-2" />
                Browse Tenders
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Improved for mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Active Tenders"
          value={stats?.tender_count ?? 0}
          subtitle={`+${stats?.new_tenders_24h ?? 0} in 24h`}
          icon={FileText}
          trend={stats?.new_tenders_24h ? "up" : undefined}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Sources"
          value={stats?.source_count ?? 0}
          subtitle={`of ${stats?.max_sources ?? 30} max`}
          icon={Globe}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          progress={(stats?.source_count ?? 0) / (stats?.max_sources ?? 30) * 100}
        />
        <StatCard
          title="Subscribers"
          value={stats?.subscriber_count ?? 0}
          subtitle={`of ${stats?.max_subscribers ?? 1} max`}
          icon={Mail}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          title="Closing Soon"
          value={closingSoonTenders?.length ?? 0}
          subtitle="within 7 days"
          icon={AlertTriangle}
          iconColor="text-orange-500"
          iconBg="bg-orange-500/10"
          urgent={(closingSoonTenders?.length ?? 0) > 3}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Tenders */}
        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Recent Tenders</CardTitle>
                <CardDescription>Latest opportunities found</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden sm:flex rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" asChild>
                <Link href="/tenders">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentTenders && recentTenders.length > 0 ? (
              <>
                {recentTenders.map((tender, index) => (
                  <TenderListItem 
                    key={tender.id} 
                    tender={tender} 
                    index={index}
                    showSource
                  />
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-3 sm:hidden rounded-lg" asChild>
                  <Link href="/tenders">
                    View all tenders <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <EmptyState 
                message="No tenders found yet"
                description="They will appear here once the crawler runs."
              />
            )}
          </CardContent>
        </Card>

        {/* High Priority */}
        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg border-red-500/20 hover:border-red-500/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  </span>
                  High Priority
                </CardTitle>
                <CardDescription>Don&apos;t miss these opportunities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden sm:flex rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors" asChild>
                <Link href="/tenders?priority=high">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {highPriorityTenders && highPriorityTenders.length > 0 ? (
              <>
                {highPriorityTenders.map((tender, index) => (
                  <TenderListItem 
                    key={tender.id} 
                    tender={tender}
                    index={index}
                    showDeadline
                  />
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-3 sm:hidden rounded-lg" asChild>
                  <Link href="/tenders?priority=high">
                    View all high priority <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <EmptyState 
                message="No high priority tenders"
                description="Great! You're all caught up."
              />
            )}
          </CardContent>
        </Card>

        {/* Closing Soon - Full width on all screens */}
        <Card className="lg:col-span-2 group overflow-hidden transition-all duration-300 hover:shadow-lg border-orange-500/20 hover:border-orange-500/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/10">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </span>
                  Closing Soon
                </CardTitle>
                <CardDescription>Act fast - these close within 7 days</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden sm:flex rounded-lg hover:bg-orange-500/10 hover:text-orange-600 transition-colors" asChild>
                <Link href="/tenders?closing_soon=true">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {closingSoonTenders && closingSoonTenders.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closingSoonTenders.map((tender, index) => (
                  <ClosingSoonCard key={tender.id} tender={tender} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState 
                message="No tenders closing soon"
                description="Check back later for upcoming deadlines."
              />
            )}
            <Button variant="ghost" size="sm" className="w-full mt-4 sm:hidden rounded-lg" asChild>
              <Link href="/tenders?closing_soon=true">
                View all closing soon <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  iconColor,
  iconBg,
  progress,
  urgent,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  iconColor: string;
  iconBg: string;
  progress?: number;
  urgent?: boolean;
}) {
  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${urgent ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-transparent' : 'hover:border-primary/30'}`}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${urgent ? 'text-orange-500' : ''}`}>
              {value.toLocaleString()}
            </p>
          </div>
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
        {progress !== undefined ? (
          <div className="mt-4 space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
          </div>
        ) : (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            {trend === "up" && (
              <span className="inline-flex items-center gap-0.5 text-emerald-500 font-medium">
                <TrendingUp className="h-3 w-3" />
              </span>
            )}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TenderListItem({ 
  tender, 
  index,
  showSource,
  showDeadline,
}: { 
  tender: Tender & { source?: { name: string } | null };
  index: number;
  showSource?: boolean;
  showDeadline?: boolean;
}) {
  return (
    <Link 
      href={`/tenders/${tender.id}`}
      className="flex items-start gap-3 p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors duration-200">
        <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
          {tender.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {showSource && (
            <>
              <span className="truncate max-w-[120px]">{tender.source?.name ?? "Unknown"}</span>
              <span className="hidden sm:inline">•</span>
            </>
          )}
          <span className="hidden sm:inline">{formatDateShort(tender.first_seen)}</span>
          <Badge className={`${getCategoryColor(tender.category)} text-[10px] px-1.5 py-0 font-medium`}>
            {tender.category}
          </Badge>
        </div>
      </div>
      {showDeadline && tender.days_remaining != null && (
        <div className="text-right shrink-0">
          <span className={`text-xs font-semibold ${
            (tender.days_remaining ?? 0) <= 3 ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {formatDaysRemaining(tender.days_remaining)}
          </span>
        </div>
      )}
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
    </Link>
  );
}

function ClosingSoonCard({ tender, index }: { tender: Tender; index: number }) {
  const isUrgent = tender.days_remaining != null && tender.days_remaining <= 2;
  
  return (
    <Link 
      href={`/tenders/${tender.id}`}
      className={`block p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${
        isUrgent ? 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent' : 'hover:border-primary/30 hover:bg-primary/5'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-3">
        {tender.title}
      </p>
      <div className="flex items-center justify-between">
        <Badge className={`${getCategoryColor(tender.category)} text-[10px] font-medium`}>
          {tender.category}
        </Badge>
        <span className={`text-xs font-bold ${
          isUrgent ? 'text-red-500' : 'text-orange-500'
        }`}>
          {formatDaysRemaining(tender.days_remaining)}
        </span>
      </div>
      {tender.closing_at && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Closes: {formatDateShort(tender.closing_at)}
        </p>
      )}
    </Link>
  );
}

function EmptyState({ message, description }: { message: string; description: string }) {
  return (
    <div className="text-center py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50 mx-auto mb-4">
        <FileText className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
    </div>
  );
}
