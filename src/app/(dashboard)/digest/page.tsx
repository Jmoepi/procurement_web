import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DigestPreview } from '@/components/digest/digest-preview'
import { DigestHistory } from '@/components/digest/digest-history'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Digest Preview | Procurement Radar SA',
  description: 'Preview and review your email digests',
}

export default async function DigestPage() {
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

  // Get recent tenders for preview (tenders from last 24 hours)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const { data: recentTenders } = await supabase
    .from('tenders')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('expired', false)
    .gte('first_seen', yesterday.toISOString())
    .order('priority', { ascending: false })
    .order('closing_at', { ascending: true })
    .limit(20)

  // Get digest history
  const { data: digestHistory } = await supabase
    .from('digest_runs')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('started_at', { ascending: false })
    .limit(30)

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, digest_time')
    .eq('id', profile.tenant_id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Digest</h1>
        <p className="text-muted-foreground">
          Preview your daily digest and view sending history
        </p>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">Today&apos;s Preview</TabsTrigger>
          <TabsTrigger value="history">Sending History</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <DigestPreview 
            tenders={recentTenders || []} 
            tenantName={tenant?.name || 'Your Organization'}
            digestTime={tenant?.digest_time || '07:00'}
          />
        </TabsContent>

        <TabsContent value="history">
          <DigestHistory digests={digestHistory || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
