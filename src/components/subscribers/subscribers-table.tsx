'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/lib/sonner'
import {
  getTenderCategoryLabel,
  normalizeTenderCategorySelection,
} from '@/lib/tender-categories'
import { getCategoryColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Subscription } from '@/types/database'

interface SubscribersTableProps {
  subscribers: Subscription[]
  tenantId: string
}

export function SubscribersTable({ subscribers, tenantId }: SubscribersTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subscriberToDelete, setSubscriberToDelete] = useState<Subscription | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleToggleActive = async (subscriber: Subscription) => {
    setLoading(subscriber.id)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: !subscriber.is_active })
        .eq('id', subscriber.id)

      if (error) throw error

      toast.success(subscriber.is_active ? 'Subscriber paused' : 'Subscriber activated', {
        description: `${subscriber.email} will ${subscriber.is_active ? 'no longer' : 'now'} receive digest emails.`,
      })
      router.refresh()
    } catch (error) {
      toast.error('Failed to update subscriber status')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!subscriberToDelete) return

    setLoading(subscriberToDelete.id)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriberToDelete.id)

      if (error) throw error

      toast.success('Subscriber removed', {
        description: `${subscriberToDelete.email} has been removed from your subscribers.`,
      })
      setDeleteDialogOpen(false)
      setSubscriberToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error('Failed to remove subscriber')
    } finally {
      setLoading(null)
    }
  }

  const getCategoryBadges = (categories: string[]) => {
    return normalizeTenderCategorySelection(categories).map((category) => (
      <Badge key={category} variant="secondary" className={getCategoryColor(category)}>
        {getTenderCategoryLabel(category)}
      </Badge>
    ))
  }

  if (subscribers.length === 0) {
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
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">No subscribers yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add subscribers to start sending them daily tender digest emails.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="font-medium">{subscriber.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getCategoryBadges(subscriber.preferences?.categories || [])}
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {subscriber.preferences?.digestFrequency || 'daily'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={subscriber.is_active}
                      onCheckedChange={() => handleToggleActive(subscriber)}
                      disabled={loading === subscriber.id}
                    />
                    <span className="text-sm text-muted-foreground">
                      {subscriber.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(subscriber.created_at).toLocaleDateString('en-ZA')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <span className="sr-only">Actions</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(subscriber)}
                      >
                        {subscriber.is_active ? 'Pause' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSubscriberToDelete(subscriber)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove subscriber</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {subscriberToDelete?.email}? They will no
              longer receive digest emails.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading === subscriberToDelete?.id}
            >
              {loading === subscriberToDelete?.id ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
