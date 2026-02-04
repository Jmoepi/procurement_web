import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export const metadata: Metadata = {
  title: 'Analytics | Procurement Radar SA',
  description: 'View tender analytics and insights',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user's profile to get tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  // Get tender stats by category
  const { data: categoryStats } = await supabase
    .from('tenders')
    .select('category')
    .eq('tenant_id', profile.tenant_id)

  // Get tender stats by priority
  const { data: priorityStats } = await supabase
    .from('tenders')
    .select('priority')
    .eq('tenant_id', profile.tenant_id)

  // Get tenders over time (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: recentTenders } = await supabase
    .from('tenders')
    .select('created_at, category, priority')
    .eq('tenant_id', profile.tenant_id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Get source activity
  const { data: sourceStats } = await supabase
    .from('sources')
    .select('name, last_crawled_at, metadata')
    .eq('tenant_id', profile.tenant_id)
    .eq('enabled', true)
    .order('last_crawled_at', { ascending: false })
    .limit(10)

  // Map source stats to include crawl_success_rate and tenders_found from metadata
  const mappedSourceStats = (sourceStats || []).map(s => ({
    name: s.name,
    last_crawled_at: s.last_crawled_at,
    crawl_success_rate: (s.metadata as Record<string, unknown>)?.crawl_success_rate as number | null ?? null,
    tenders_found: (s.metadata as Record<string, unknown>)?.tenders_found as number | null ?? null,
  }))

  // Get digest stats
  const { data: digestStats } = await supabase
    .from('digest_runs')
    .select('created_at, tenders_found, emails_sent, status')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(30)

  // Map digest stats to expected format
  const mappedDigestStats = (digestStats || []).map(d => ({
    created_at: d.created_at,
    tender_count: d.tenders_found ?? 0,
    recipient_count: d.emails_sent ?? 0,
    status: d.status,
  }))

  // Process category counts
  const categoryCounts = (categoryStats || []).reduce((acc, { category }) => {
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Process priority counts
  const priorityCounts = (priorityStats || []).reduce((acc, { priority }) => {
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Process daily counts
  const dailyCounts = (recentTenders || []).reduce((acc, { created_at }) => {
    const date = new Date(created_at).toISOString().split('T')[0] as string
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and statistics about your tender monitoring
        </p>
      </div>

      <AnalyticsDashboard
        categoryCounts={categoryCounts}
        priorityCounts={priorityCounts}
        dailyCounts={dailyCounts}
        sourceStats={mappedSourceStats}
        digestStats={mappedDigestStats}
        totalTenders={categoryStats?.length || 0}
      />
    </div>
  )
}
