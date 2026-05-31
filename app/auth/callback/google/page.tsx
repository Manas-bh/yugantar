"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sanitizeCallbackUrl } from "@/lib/security/validation";

function GoogleCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processing authentication...");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get("error");
        const authSuccess = searchParams.get("auth");
        const errorMessage = searchParams.get("message");

        if (error) {
          setStatus("error");
          setMessage(errorMessage || `Authentication failed: ${error}`);
          return;
        }

        if (authSuccess === "success") {
          setStatus("success");
          setMessage("Authentication successful! Loading your profile...");

              // Get the intended callback URL
              const intendedCallbackUrl = sanitizeCallbackUrl(
                searchParams.get("callbackUrl") || "/"
              );

          // Fetch user data and populate localStorage
          try {
            const userResponse = await fetch("/api/auth/me");
            if (userResponse.ok) {
              const userData = await userResponse.json();
              localStorage.setItem("user", JSON.stringify(userData.user));
              setMessage("Welcome back! Redirecting...");

              // Redirect to the intended destination or based on user role
              setTimeout(() => {
                let finalRedirect = intendedCallbackUrl;

                // Override with role-based redirect if going to default pages
                if (
                  userData.user.role === "admin" &&
                  (finalRedirect === "/" || finalRedirect === "/auth")
                ) {
                  finalRedirect = "/admin";
                }

                router.push(finalRedirect);
              }, 1500);
            } else {
              throw new Error("Failed to fetch user data");
            }
          } catch (error) {
            console.error("Failed to fetch user data:", error);
            setStatus("error");
            setMessage(
              "Authentication successful but failed to load profile. Please try refreshing."
            );
          }
          return;
        }

        // If we get here with error
        if (error) {
          setStatus("error");
          setMessage(errorMessage || `Authentication failed: ${error}`);
          return;
        }

        // If we have neither auth=success nor error, something is wrong
        setStatus("error");
        setMessage("Invalid authentication state. Please try again.");
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Authentication failed"
        );
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
      case "success":
        return <CheckCircle className="h-10 w-10 text-green-600" />;
      case "error":
        return <XCircle className="h-10 w-10 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading":
        return "Authenticating...";
      case "success":
        return "Welcome!";
      case "error":
        return "Authentication Failed";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="app-shell flex items-center justify-center py-10 sm:py-14">
        <Card className="surface-card w-full max-w-md overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
                {getIcon()}
              </div>
              <p className="section-kicker">google oauth</p>
              <h2 className="text-2xl font-extrabold lowercase text-foreground">
                {getTitle()}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {message}
              </p>

              {status === "error" && (
                <div className="w-full space-y-2 pt-1">
                  <Button asChild className="cta-pill-primary w-full justify-center">
                    <Link href="/auth">Try Again</Link>
                  </Button>
                  <Button variant="outline" asChild className="cta-pill w-full justify-center">
                    <Link href="/">Go Home</Link>
                  </Button>
                </div>
              )}

              {status === "success" && (
                <p className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                  You will be redirected automatically...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
