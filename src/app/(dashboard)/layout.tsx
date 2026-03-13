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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_hsl(var(--chart-1)/0.20),transparent_52%)]" />
      <div className="pointer-events-none fixed left-[-10rem] top-[22rem] -z-10 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,_hsl(var(--chart-2)/0.14),transparent_68%)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-8rem] top-[14rem] -z-10 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,_hsl(var(--chart-4)/0.14),transparent_68%)] blur-3xl" />
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

