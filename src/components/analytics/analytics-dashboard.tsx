'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getDigestRecipientCount, getDigestTenderCount, isDigestSuccess } from '@/lib/digests'
import { getCategoryColor, getPriorityColor } from '@/lib/utils'

interface AnalyticsDashboardProps {
  categoryCounts: Record<string, number>
  priorityCounts: Record<string, number>
  dailyCounts: Record<string, number>
  sourceStats: Array<{
    name: string
    last_crawled_at: string | null
    crawl_success_rate: number | null
    tenders_found: number | null
  }>
  digestStats: Array<{
    created_at: string
    tenders_found?: number
    tender_count?: number
    emails_sent?: number
    recipient_count?: number
    metadata?: Record<string, unknown>
    status: string
  }>
  totalTenders: number
}

export function AnalyticsDashboard({
  categoryCounts,
  priorityCounts,
  dailyCounts,
  sourceStats,
  digestStats,
  totalTenders,
}: AnalyticsDashboardProps) {
  // Calculate totals for percentages
  const totalByCategory = Object.values(categoryCounts).reduce((a, b) => a + b, 0)
  const totalByPriority = Object.values(priorityCounts).reduce((a, b) => a + b, 0)

  // Sort categories by count
  const sortedCategories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)
  const sortedPriorities = Object.entries(priorityCounts).sort(([, a], [, b]) => b - a)

  // Calculate average tenders per day
  const dailyValues = Object.values(dailyCounts)
  const avgTendersPerDay = dailyValues.length > 0
    ? Math.round(dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length)
    : 0

  // Get last 7 days trend
  const last7Days = Object.entries(dailyCounts)
    .slice(-7)
    .map(([date, count]) => ({ date, count }))

  // Calculate digest success rate
  const successfulDigests = digestStats.filter((d) => isDigestSuccess(d.status)).length
  const digestSuccessRate = digestStats.length > 0
    ? Math.round((successfulDigests / digestStats.length) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tenders</CardDescription>
            <CardTitle className="text-3xl">{totalTenders.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All time discovered tenders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Per Day</CardDescription>
            <CardTitle className="text-3xl">{avgTendersPerDay}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Last 30 days average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sources</CardDescription>
            <CardTitle className="text-3xl">{sourceStats.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Enabled and monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Digest Success</CardDescription>
            <CardTitle className="text-3xl">{digestSuccessRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Email delivery rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tenders by Category</CardTitle>
            <CardDescription>Distribution across tender categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available yet
              </p>
            ) : (
              sortedCategories.map(([category, count]) => {
                const percentage = totalByCategory > 0 ? (count / totalByCategory) * 100 : 0
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(category)} variant="secondary">
                          {category.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} tenders
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tenders by Priority</CardTitle>
            <CardDescription>Distribution across priority levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedPriorities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available yet
              </p>
            ) : (
              sortedPriorities.map(([priority, count]) => {
                const percentage = totalByPriority > 0 ? (count / totalByPriority) * 100 : 0
                return (
                  <div key={priority} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(priority)} variant="secondary">
                          {priority}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} tenders
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources and Trend Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Sources</CardTitle>
            <CardDescription>Sources with most tenders discovered</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No source data available yet
              </p>
            ) : (
              <div className="space-y-4">
                {sourceStats.slice(0, 5).map((source, index) => (
                  <div key={source.name} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{source.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {source.tenders_found || 0} tenders found
                      </p>
                    </div>
                    {source.crawl_success_rate !== null && (
                      <Badge
                        variant={source.crawl_success_rate >= 90 ? 'default' : 'secondary'}
                      >
                        {source.crawl_success_rate}% success
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days</CardTitle>
            <CardDescription>Daily tender discovery trend</CardDescription>
          </CardHeader>
          <CardContent>
            {last7Days.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available yet
              </p>
            ) : (
              <div className="space-y-3">
                {last7Days.map(({ date, count }) => {
                  const maxCount = Math.max(...last7Days.map((d) => d.count), 1)
                  const percentage = (count / maxCount) * 100
                  const dayName = new Date(date).toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  return (
                    <div key={date} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{dayName}</span>
                        <span className="font-medium">{count} tenders</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Digest History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Digests</CardTitle>
          <CardDescription>Last 10 email digest sends</CardDescription>
        </CardHeader>
        <CardContent>
          {digestStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No digests sent yet
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-5">
              {digestStats.slice(0, 10).map((digest) => {
                const date = new Date(digest.created_at)
                return (
                  <div
                    key={digest.created_at}
                    className="p-3 rounded-lg border text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-lg font-bold">{getDigestTenderCount(digest)}</p>
                    <p className="text-xs text-muted-foreground">tenders</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {getDigestRecipientCount(digest)} recipients
                    </p>
                    <Badge
                      variant={isDigestSuccess(digest.status) ? 'default' : 'destructive'}
                      className="mt-2"
                    >
                      {isDigestSuccess(digest.status) ? '✓' : '✗'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
