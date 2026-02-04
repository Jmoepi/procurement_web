import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "../login/auth-form";
import { Radar, Check, Sparkles } from "lucide-react";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const features = [
    "Monitor all major SA government portals",
    "AI-powered tender categorization",
    "Real-time email & SMS alerts",
    "Daily digest summaries",
    "Unlimited tender access",
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Premium Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[150px]" />
        
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
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Start Free Trial</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                30 days free,<br />no credit card required
              </h1>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-500/10">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-slate-700 bg-gradient-to-br from-slate-600 to-slate-700"
                />
              ))}
            </div>
            <p className="text-sm text-slate-400">
              Join <span className="text-white font-semibold">500+</span> businesses
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-8 sm:px-8 relative">
        {/* Subtle background gradient */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Start your 30-day free trial today
            </p>
          </div>

          {/* Mobile Features Preview */}
          <div className="lg:hidden grid grid-cols-2 gap-2 text-xs">
            {features.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground truncate">{feature}</span>
              </div>
            ))}
          </div>
          
          <AuthForm mode="signup" />
          
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">
                  No credit card required
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
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
