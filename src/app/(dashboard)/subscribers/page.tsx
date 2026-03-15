import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubscribersTable } from '@/components/subscribers/subscribers-table'
import { AddSubscriberDialog } from '@/components/subscribers/add-subscriber-dialog'
import { getCurrentWorkspaceContext } from '@/lib/current-workspace'

export const metadata: Metadata = {
  title: 'Subscribers | Procurement Radar SA',
  description: 'Manage your digest subscribers',
}

export default async function SubscribersPage() {
  const supabase = await createClient()
  const workspace = await getCurrentWorkspaceContext(supabase)
  if (!workspace?.user) redirect('/auth/login')
  const profile = workspace.profile

  if (!profile) redirect('/dashboard')

  // Get subscribers for this tenant
  const { data: subscribers } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  // Get tenant stats for limits
  const { data: stats } = await supabase
    .from('tenant_stats')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .single()

  const subscriberCount = subscribers?.length || 0
  const subscriberLimit = stats?.max_subscribers || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-muted-foreground">
            Manage who receives your daily tender digest emails
          </p>
        </div>
        <AddSubscriberDialog 
          tenantId={profile.tenant_id}
          subscriberCount={subscriberCount}
          subscriberLimit={subscriberLimit}
        />
      </div>

      {/* Usage */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Subscriber Usage</p>
            <p className="text-xs text-muted-foreground">
              {subscriberCount} of {subscriberLimit === -1 ? 'Unlimited' : subscriberLimit} subscribers used
            </p>
          </div>
          {subscriberLimit !== -1 && (
            <div className="w-32">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${Math.min((subscriberCount / subscriberLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <SubscribersTable 
        subscribers={subscribers || []} 
        tenantId={profile.tenant_id}
      />
    </div>
  )
}
