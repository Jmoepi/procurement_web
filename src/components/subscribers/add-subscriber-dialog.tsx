'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface AddSubscriberDialogProps {
  tenantId: string
  subscriberCount: number
  subscriberLimit: number
}

const CATEGORIES = [
  { id: 'courier', label: 'Courier & Delivery' },
  { id: 'printing', label: 'Printing & Publishing' },
  { id: 'logistics', label: 'Logistics & Transport' },
  { id: 'stationery', label: 'Stationery & Office Supplies' },
  { id: 'it_hardware', label: 'IT Hardware' },
  { id: 'general', label: 'General' },
]

export function AddSubscriberDialog({
  tenantId,
  subscriberCount,
  subscriberLimit,
}: AddSubscriberDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['courier', 'printing'])
  const router = useRouter()
  const supabase = createClient()

  const isAtLimit = subscriberLimit !== -1 && subscriberCount >= subscriberLimit

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    if (selectedCategories.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one category',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('subscriptions').insert({
        tenant_id: tenantId,
        email: email.trim().toLowerCase(),
        is_active: true,
        preferences: {
          categories: selectedCategories,
          highPriorityOnly: false,
          keywordsInclude: [],
          keywordsExclude: [],
          maxItems: 15,
          digestFrequency: 'daily',
        },
      })

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already subscribed')
        }
        if (error.message.includes('subscriber limit')) {
          throw new Error('You have reached your subscriber limit. Please upgrade your plan.')
        }
        throw error
      }

      toast({
        title: 'Subscriber added',
        description: `${email} will now receive digest emails.`,
      })

      setOpen(false)
      setEmail('')
      setName('')
      setSelectedCategories(['courier', 'printing'])
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add subscriber',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isAtLimit}>
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Subscriber
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Subscriber</DialogTitle>
            <DialogDescription>
              Add a new email recipient for your daily tender digest.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categories to Receive *</Label>
              <p className="text-xs text-muted-foreground">
                Select which tender categories this subscriber should receive
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CATEGORIES.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <Label
                      htmlFor={category.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Subscriber'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
