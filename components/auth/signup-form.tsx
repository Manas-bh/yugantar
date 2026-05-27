"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Chrome,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SignupFormProps {
  onToggleForm: () => void;
}

type SignupStep = "details" | "otp";

export function SignupForm({ onToggleForm }: SignupFormProps) {
  const [step, setStep] = useState<SignupStep>("details");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldownSeconds]);

  const handleStartSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match!");
      }

      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const response = await fetch("/api/auth/register/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setExpiresInMinutes(Number(data.expiresInMinutes) || 10);
      setResendCooldownSeconds(60);
      setStep("otp");
      setSuccessMessage("OTP sent to your email. Enter it below to complete signup.");
    } catch (error) {
      console.error("Registration start error:", error);
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);
      if (normalizedOtp.length !== 6) {
        throw new Error("Please enter the 6-digit OTP");
      }

      const response = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: normalizedOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      try {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "user",
            newValue: JSON.stringify(data.user),
          })
        );
      } catch {
        // Ignore cross-browser StorageEvent constructor issues.
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(
        error instanceof Error ? error.message : "OTP verification failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResendLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/register/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      const nextCooldown = Number(data.resendCooldownSeconds) || 60;
      setResendCooldownSeconds(nextCooldown);
      setExpiresInMinutes(Number(data.expiresInMinutes) || 10);
      setSuccessMessage("A new OTP has been sent to your email.");
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError(error instanceof Error ? error.message : "Failed to resend OTP");
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const response = await fetch(`/api/auth/google/url?callbackUrl=${encodeURIComponent("/")}`);
      const data = await response.json();

      if (!response.ok || !data?.success || !data?.url) {
        throw new Error(data?.error || "Google OAuth is not configured");
      }

      window.location.href = data.url;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to initialize Google OAuth");
    }
  };

  return (
    <Card className="surface-card mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-extrabold lowercase text-foreground">
          Create Account
        </CardTitle>
        <p className="text-muted-foreground">
          Join Yugantar and express your creativity
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {step === "details" ? (
          <form onSubmit={handleStartSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                className="rounded"
                required
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a href="/terms" className="text-primary hover:text-primary/80">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:text-primary/80">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-3 text-sm text-foreground">
              Enter the 6-digit OTP sent to <strong>{formData.email}</strong>. It expires in {expiresInMinutes} minutes.
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying OTP..." : "Verify & Create Account"}
            </Button>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("details");
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={isLoading || isResendLoading}
              >
                Edit details
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOtp}
                disabled={isLoading || isResendLoading || resendCooldownSeconds > 0}
              >
                {isResendLoading
                  ? "Resending..."
                  : resendCooldownSeconds > 0
                  ? `Resend in ${resendCooldownSeconds}s`
                  : "Resend OTP"}
              </Button>
            </div>
          </form>
        )}

        {step === "details" ? (
          <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
            </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Google signup does not require OTP.
          </div>
        )}

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <button
            onClick={onToggleForm}
            className="font-medium text-primary hover:text-primary/80"
            disabled={isLoading}
          >
            Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
