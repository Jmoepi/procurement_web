'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  getDigestCompletedAt,
  getDigestRecipientCount,
  getDigestTenderCount,
  normalizeDigestStatus,
} from '@/lib/digests'
import type { DigestRun } from '@/types/database'

interface DigestHistoryProps {
  digests: DigestRun[]
}

export function DigestHistory({ digests }: DigestHistoryProps) {
  const getStatusBadge = (status: string) => {
    const normalizedStatus = normalizeDigestStatus(status)
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      success: { variant: 'default', label: 'Sent' },
      fail: { variant: 'destructive', label: 'Failed' },
    }
    
    const config = statusConfig[normalizedStatus] || { variant: 'outline' as const, label: normalizedStatus }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (digests.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">No digests sent yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Once the daily digest runs, you&apos;ll see a history of all sent emails here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Tenders Included</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {digests.map((digest) => (
            <TableRow key={digest.id}>
              <TableCell className="font-medium">
                {new Date(digest.created_at).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell>{getDigestTenderCount(digest)}</TableCell>
              <TableCell>{getDigestRecipientCount(digest)}</TableCell>
              <TableCell>{getStatusBadge(digest.status)}</TableCell>
              <TableCell className="text-muted-foreground">
                {getDigestCompletedAt(digest)
                  ? new Date(getDigestCompletedAt(digest)!).toLocaleString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
