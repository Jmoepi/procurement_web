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
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div>
            <Link href="/" className="inline-flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Radar className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">Procurement Radar SA</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80 mb-2">
                START YOUR FREE TRIAL
              </p>
              <h1 className="text-4xl font-bold leading-tight">
                14 days free,<br />no credit card required
              </h1>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-primary-foreground/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-primary bg-primary-foreground/20 backdrop-blur"
                />
              ))}
            </div>
            <p className="text-sm text-primary-foreground/80">
              Join 500+ businesses
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-8 sm:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Radar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Procurement Radar SA</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">Create your account</h1>
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
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  No credit card required
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
