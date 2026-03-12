import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardMobileTabBar } from "@/components/dashboard/mobile-tab-bar";
import { PageTransition } from "@/components/ui/page-transition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile and tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[26rem] bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-noise" />
      <DashboardHeader user={user} profile={profile} />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <DashboardNav profile={profile} />
        <main className="flex-1 overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <PageTransition>
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </PageTransition>
        </main>
      </div>
      <DashboardMobileTabBar profile={profile} />
    </div>
  );
}
