import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getGoogleOAuthURL,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { success: false, error: "Google OAuth is not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get("callbackUrl") || undefined;
    const redirectUri =
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/auth/callback/google`;
    const url = getGoogleOAuthURL(callbackUrl, redirectUri);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    logger.error("Failed to generate Google OAuth URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Google OAuth URL" },
      { status: 500 }
    );
  }
}
