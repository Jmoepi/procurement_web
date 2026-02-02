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
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

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
    .select('name, last_crawled_at, crawl_success_rate, tenders_found')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_enabled', true)
    .order('tenders_found', { ascending: false })
    .limit(10)

  // Get digest stats
  const { data: digestStats } = await supabase
    .from('digest_runs')
    .select('created_at, tender_count, recipient_count, status')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(30)

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
        sourceStats={sourceStats || []}
        digestStats={digestStats || []}
        totalTenders={categoryStats?.length || 0}
      />
    </div>
  )
}
