"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  phone: string | null;
  lastAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    phone: string;
  } | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.href =
            "/auth?callbackUrl=" + encodeURIComponent("/profile");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();
        setProfile(data.profile || null);
      } catch (error) {
        console.error("Failed to load profile:", error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-background">

      <div className="app-shell pt-4">
        <div className="section-shell mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-xl font-extrabold lowercase text-foreground">My Profile</h1>
          <div className="w-[120px]" aria-hidden="true" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <Card className="surface-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading profile...
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card className="surface-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              Could not load your profile details.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-2xl font-extrabold lowercase">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="text-sm font-medium text-foreground">{profile.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium text-foreground">{profile.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium text-foreground">
                    {profile.phone || "No phone found yet"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-2xl font-extrabold lowercase">Last Saved Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.lastAddress ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {profile.lastAddress.fullName}
                    </p>
                    <p className="text-sm text-foreground/80">
                      {profile.lastAddress.addressLine1}
                    </p>
                    {profile.lastAddress.addressLine2 ? (
                      <p className="text-sm text-foreground/80">
                        {profile.lastAddress.addressLine2}
                      </p>
                    ) : null}
                    <p className="text-sm text-foreground/80">
                      {profile.lastAddress.city}, {profile.lastAddress.state} -{" "}
                      {profile.lastAddress.pinCode}
                    </p>
                    <p className="text-sm text-foreground/80">
                      Phone: {profile.lastAddress.phone}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No address found. Place an order to save your address.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8">
          <Link href="/orders">
            <Button className="cta-pill-primary">View My Orders</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
