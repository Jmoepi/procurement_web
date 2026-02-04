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
import { toast } from '@/components/ui/use-toast'
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

      toast({
        title: subscriber.is_active ? 'Subscriber paused' : 'Subscriber activated',
        description: `${subscriber.email} will ${subscriber.is_active ? 'no longer' : 'now'} receive digest emails.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update subscriber status',
        variant: 'destructive',
      })
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

      toast({
        title: 'Subscriber removed',
        description: `${subscriberToDelete.email} has been removed from your subscribers.`,
      })
      setDeleteDialogOpen(false)
      setSubscriberToDelete(null)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove subscriber',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const getCategoryBadges = (categories: string[]) => {
    const categoryColors: Record<string, string> = {
      courier: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      printing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      logistics: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      stationery: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      it_hardware: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    }

    return categories.map((cat) => (
      <Badge key={cat} variant="secondary" className={categoryColors[cat] || ''}>
        {cat.replace('_', ' ')}
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
