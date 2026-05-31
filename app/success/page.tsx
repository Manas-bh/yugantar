"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    // Redirect to orders page after 3 seconds
    const timer = setTimeout(() => {
      router.push("/orders");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="app-shell flex items-center justify-center py-10">
      <Card className="surface-card w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-extrabold lowercase text-foreground">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your order has been placed successfully.
            {orderId && (
              <>
                <br />
                Order ID: <span className="font-semibold">{orderId}</span>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to your orders page in 3 seconds...
          </p>
          <div className="flex flex-col space-y-2">
            <Button asChild className="cta-pill-primary">
              <Link
                href="/orders"
                className="flex items-center justify-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>View My Orders</span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
