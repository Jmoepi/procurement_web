"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/sonner";
import { Loader2, Mail, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get email from URL params or session storage
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      const storedEmail = sessionStorage.getItem("verification_email");
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, "");
      setOtp(newOtp);
      
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Invalid code", {
        description: "Please enter the complete 6-digit code.",
      });
      return;
    }

    setLoading(true);
    try {
      const storedPassword = sessionStorage.getItem('signup_password');
      const storedFullName = sessionStorage.getItem('signup_full_name') || '';
      const storedInvite = sessionStorage.getItem('signup_invite_token') || undefined;
      if (!storedPassword) throw new Error('Signup state missing. Please re-start signup.');

      // Verify OTP and create the user on the server
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          password: storedPassword,
          full_name: storedFullName,
          invite_token: storedInvite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Invalid or expired code');

      // Establish a client session after server-side account creation
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: storedPassword,
      });

      if (signInErr) throw signInErr;

      setVerified(true);
      toast({ title: 'Email verified!', description: 'Your account has been created.' });

      // clear temporary signup state
      sessionStorage.removeItem('verification_email');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('signup_full_name');
      sessionStorage.removeItem('signup_invite_token');

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      toast.error("Verification failed", {
        description: error instanceof Error ? error.message : "Invalid or expired code. Please try again.",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not resend code');

      setCountdown(60);
      toast({
        title: data?.delivery === "console" ? "Code regenerated" : "Code resent",
        description:
          data?.message ||
          "A new verification code has been sent to your email.",
      });
    } catch (error) {
      toast.error("Failed to resend", {
        description: error instanceof Error ? error.message : "Could not resend code. Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (otp.every((digit) => digit !== "") && !loading && !verified) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, loading, verified]);

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 animate-scale-in">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-4">
              Redirecting you to your dashboard...
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/auth/signup">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to signup
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto mb-2">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              We&apos;ve sent a 6-digit verification code to
              {email && (
                <span className="block font-medium text-foreground mt-1">{email}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold"
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={loading || otp.some((d) => !d)}
              className="w-full h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            {/* Resend */}
            <div className="text-center text-sm">
              <p className="text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                {countdown > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Resend code
                      </>
                    )}
                  </button>
                )}
              </p>
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-muted-foreground">
              Make sure to check your spam folder if you don&apos;t see the email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
