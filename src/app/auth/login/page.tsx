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
      {/* Left Side - Clean branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-background">
          <div>
            <Link href="/" className="inline-flex items-center space-x-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Radar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Procurement Radar</span>
            </Link>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">
              Never miss a tender opportunity again
            </h1>
            <p className="text-lg text-background/70 max-w-md">
              AI-powered monitoring of South African government tenders for courier and printing services.
            </p>

            <div className="grid gap-3 mt-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <Clock className="h-5 w-5 text-background/80" />
                <p className="text-sm">Real-time alerts when new tenders match your criteria</p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <Sparkles className="h-5 w-5 text-background/80" />
                <p className="text-sm">Smart categorization and priority scoring</p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <Shield className="h-5 w-5 text-background/80" />
                <p className="text-sm">Monitor all major government tender portals</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-background/60">
            <CheckCircle2 className="h-4 w-4" />
            Trusted by 500+ businesses across South Africa
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-8 sm:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Radar className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Procurement Radar</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome back</h1>
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
