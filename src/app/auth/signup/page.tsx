import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "../login/auth-form";
import { Radar, Check } from "lucide-react";

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

          <div className="space-y-8">
            <div>
              <p className="text-sm text-background/60 mb-3">Start Free Trial</p>
              <h1 className="text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">
                14 days free,<br />no credit card required
              </h1>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <Check className="h-4 w-4 text-background/80" />
                  <span className="text-sm text-background/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-background/60">
            Join 500+ businesses across South Africa
          </p>
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
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Start your 14-day free trial today
            </p>
          </div>

          {/* Mobile Features Preview */}
          <div className="lg:hidden grid grid-cols-2 gap-2 text-xs">
            {features.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary shrink-0" />
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
