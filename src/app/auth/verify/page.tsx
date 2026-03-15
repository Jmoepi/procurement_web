"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/sonner";
import { ArrowLeft, CheckCircle, Loader2, Mail, RefreshCw } from "lucide-react";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpFallback />}>
      <VerifyOtpContent />
    </Suspense>
  );
}

function VerifyOtpContent() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const emailParam = searchParams?.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const nextOtp = [...otp];
      digits.forEach((digit, offset) => {
        if (index + offset < 6) {
          nextOtp[index + offset] = digit;
        }
      });
      setOtp(nextOtp);
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value.replace(/\D/g, "");
    setOtp(nextOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (!email || code.length !== 6) {
      toast.error("Invalid code", {
        description: "Enter the full 6-digit code from your email.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) {
        throw error;
      }

      setVerified(true);
      toast.success("Email verified", {
        description: "Your account is active. Redirecting to the dashboard.",
      });

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (error) {
      toast.error("Verification failed", {
        description: error instanceof Error ? error.message : "The code is invalid or expired.",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || countdown > 0) {
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        throw error;
      }

      setCountdown(60);
      toast.success("Code resent", {
        description: "A new 6-digit code has been sent to your email.",
      });
    } catch (error) {
      toast.error("Failed to resend code", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email verified</h2>
            <p className="text-muted-foreground mb-4">Redirecting you to your dashboard...</p>
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
              Enter the 6-digit code Supabase sent to
              {email ? <span className="block font-medium text-foreground mt-1">{email}</span> : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold"
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              disabled={loading || otp.some((digit) => !digit)}
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

            <div className="text-center text-sm">
              <p className="text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VerifyOtpFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading verification page...</span>
        </CardContent>
      </Card>
    </div>
  );
}
