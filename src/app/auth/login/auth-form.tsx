"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "signup";
}

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const passwordStrength = getPasswordStrength(password);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // Store email for OTP verification page
        sessionStorage.setItem("verification_email", email);
        
        toast({
          title: "Verification code sent!",
          description: "Please check your email for the 6-digit code.",
        });

        // Redirect to OTP verification page
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/60 shadow-xl bg-card/80 backdrop-blur-sm">
      <CardContent className="pt-6 pb-8 px-6 sm:px-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocused("fullName")}
                  onBlur={() => setFocused(null)}
                  required
                  className={cn(
                    "pl-10 h-11 rounded-xl border-border/60 transition-all duration-300",
                    focused === "fullName" && "ring-2 ring-primary/20 border-primary/30"
                  )}
                />
                {fullName.length >= 2 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                required
                className={cn(
                  "pl-10 h-11 rounded-xl border-border/60 transition-all duration-300",
                  focused === "email" && "ring-2 ring-primary/20 border-primary/30"
                )}
              />
              {email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidEmail ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                required
                minLength={6}
                className={cn(
                  "pl-10 pr-10 h-11 rounded-xl border-border/60 transition-all duration-300",
                  focused === "password" && "ring-2 ring-primary/20 border-primary/30"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Password strength indicator for signup */}
            {mode === "signup" && password && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-300",
                        i <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-semibold">{passwordStrength.label}</span>
                </p>
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-11 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signup" ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              <>
                {mode === "signup" ? "Create Account" : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
