import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "./auth-form";
import { Radar, Shield, Clock, Sparkles, CheckCircle2 } from "lucide-react";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Premium Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                <Radar className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Procurement Radar SA</span>
            </Link>
          </div>

          <div className="space-y-8">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Never miss a tender opportunity again
            </h1>
            <p className="text-lg text-slate-300">
              AI-powered monitoring of South African government tenders for courier and printing services.
            </p>

            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">Real-time Alerts</p>
                  <p className="text-sm text-slate-400">Get notified instantly when new tenders match your criteria</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold">AI-Powered Analysis</p>
                  <p className="text-sm text-slate-400">Smart categorization and priority scoring</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold">Trusted Sources</p>
                  <p className="text-sm text-slate-400">Monitor all major government tender portals</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Trusted by 500+ businesses across South Africa
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-8 sm:px-8 relative">
        {/* Subtle background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        
        <div className="relative w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Radar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Procurement Radar SA</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </p>
          </div>
          
          <AuthForm mode="login" />
          
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-semibold">
                Sign up for free
              </Link>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">
                  Secure login
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
