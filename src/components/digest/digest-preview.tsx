'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Tender } from '@/types/database'
import { getCategoryColor, getPriorityColor, formatDate, getDaysRemaining } from '@/lib/utils'

interface DigestPreviewProps {
  tenders: Tender[]
  tenantName: string
  digestTime: string
}

export function DigestPreview({ tenders, tenantName, digestTime }: DigestPreviewProps) {
  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const highPriorityTenders = tenders.filter((t) => t.priority === 'high')
  const closingSoonTenders = tenders.filter((t) => {
    if (!t.closing_at) return false
    const daysRemaining = getDaysRemaining(t.closing_at)
    return daysRemaining >= 0 && daysRemaining <= 5
  })
  const newTenders = tenders.filter((t) => {
    const createdAt = new Date(t.created_at)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return createdAt >= yesterday
  })

  if (tenders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Tenders for Today&apos;s Digest</CardTitle>
          <CardDescription>
            When new tenders are discovered, they&apos;ll appear here in the preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-muted-foreground">
              The crawler will discover new tenders and include them in your next digest.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Digest scheduled for: {digestTime} SAST
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Preview of the digest that will be sent at {digestTime} SAST
          </p>
        </div>
        <Button variant="outline">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          Send Test Digest
        </Button>
      </div>

      {/* Email Preview */}
      <Card className="overflow-hidden">
        <div className="bg-primary text-primary-foreground p-6">
          <h2 className="text-2xl font-bold">🇿🇦 Procurement Radar SA</h2>
          <p className="text-primary-foreground/80 mt-1">Daily Tender Digest</p>
        </div>

        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <p className="text-lg">Good morning, {tenantName}!</p>
              <p className="text-muted-foreground mt-2">
                Here&apos;s your daily tender digest for {today}. We found{' '}
                <strong>{tenders.length} new opportunities</strong> matching your criteria.
              </p>
            </div>

            <Separator />

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{newTenders.length}</p>
                <p className="text-sm text-muted-foreground">New Tenders</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-red-600">{highPriorityTenders.length}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-orange-600">{closingSoonTenders.length}</p>
                <p className="text-sm text-muted-foreground">Closing Soon</p>
              </div>
            </div>

            <Separator />

            {/* High Priority Section */}
            {highPriorityTenders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-red-500">🔥</span> High Priority Opportunities
                </h3>
                <div className="space-y-3">
                  {highPriorityTenders.slice(0, 5).map((tender) => (
                    <TenderItem key={tender.id} tender={tender} />
                  ))}
                </div>
              </div>
            )}

            {/* Closing Soon Section */}
            {closingSoonTenders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-orange-500">⏰</span> Closing Soon
                </h3>
                <div className="space-y-3">
                  {closingSoonTenders.slice(0, 5).map((tender) => (
                    <TenderItem key={tender.id} tender={tender} />
                  ))}
                </div>
              </div>
            )}

            {/* All Tenders */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📋</span> All New Tenders
              </h3>
              <div className="space-y-3">
                {tenders.slice(0, 10).map((tender) => (
                  <TenderItem key={tender.id} tender={tender} />
                ))}
              </div>
              {tenders.length > 10 && (
                <p className="text-center text-muted-foreground mt-4">
                  ... and {tenders.length - 10} more tenders
                </p>
              )}
            </div>

            <Separator />

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                You&apos;re receiving this email because you&apos;re subscribed to Procurement Radar SA.
              </p>
              <p className="mt-2">
                <a href="#" className="text-primary hover:underline">
                  Manage preferences
                </a>
                {' · '}
                <a href="#" className="text-primary hover:underline">
                  View all tenders
                </a>
                {' · '}
                <a href="#" className="text-primary hover:underline">
                  Unsubscribe
                </a>
              </p>
              <p className="mt-4">
                © {new Date().getFullYear()} Procurement Radar SA. All rights reserved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TenderItem({ tender }: { tender: Tender }) {
  const daysRemaining = tender.closing_at ? getDaysRemaining(tender.closing_at) : null
  const issuer = (tender.metadata?.issuer as string) || tender.source?.name || 'Unknown'
  const referenceNumber = (tender.metadata?.reference_number as string) || 'N/A'
  const estimatedValue = tender.metadata?.estimated_value as number | undefined
  
  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{tender.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {issuer} · Ref: {referenceNumber}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={getCategoryColor(tender.category)} variant="secondary">
            {tender.category}
          </Badge>
          <Badge className={getPriorityColor(tender.priority)} variant="secondary">
            {tender.priority}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-muted-foreground">
          Closes: {tender.closing_at ? formatDate(tender.closing_at) : 'No deadline'}
        </span>
        {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && (
          <span className={`font-medium ${daysRemaining <= 3 ? 'text-red-600' : 'text-orange-600'}`}>
            {daysRemaining === 0 ? 'Closes today!' : `${daysRemaining} days left`}
          </span>
        )}
        {estimatedValue && (
          <span className="font-medium">
            R{estimatedValue.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
