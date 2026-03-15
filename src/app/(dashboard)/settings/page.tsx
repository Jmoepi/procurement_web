import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { BillingSection } from "@/components/settings/billing-section";
import type { Profile, Subscription, TenantStats } from "@/types";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";

export default async function SettingsPage() {
  const supabase = await createClient();
  const workspace = await getCurrentWorkspaceContext(supabase);
  const user = workspace?.user;
  const profile = (workspace?.profile ?? null) as Profile | null;

  // Get user's subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .single() as { data: Subscription | null };

  // Get tenant stats
  const { data: stats } = await supabase
    .from("tenant_stats")
    .select("*")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .single() as { data: TenantStats | null };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Email Preferences</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm 
                profile={profile} 
                email={user?.email ?? ""} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Email Preferences</CardTitle>
              <CardDescription>
                Customize what appears in your daily digest emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesForm subscription={subscription} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <BillingSection 
            profile={profile} 
            stats={stats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
