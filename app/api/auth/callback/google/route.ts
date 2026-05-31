import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  parseAndValidateOAuthState,
} from "@/lib/google-oauth";
import {
  createUser,
  getUserByEmail,
  updateUserLastLogin,
  createJWT,
} from "@/lib/auth";
import {
  getAuthCookieOptions,
  getExpiredAuthCookieOptions,
} from "@/lib/security/cookies";
import {
  sanitizeCallbackUrl,
  sanitizeEmail,
  sanitizeName,
} from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    let callbackUrl = sanitizeCallbackUrl("/");
    const parsedState = parseAndValidateOAuthState(state);

    if (state && !parsedState) {
      const callbackPageUrl = new URL("/auth/callback/google", request.url);
      callbackPageUrl.searchParams.set("error", "invalid_state");
      callbackPageUrl.searchParams.set(
        "message",
        "Invalid OAuth state. Please try logging in again."
      );
      const response = NextResponse.redirect(callbackPageUrl);
      response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
      return response;
    }

    if (parsedState) {
      callbackUrl = parsedState.callbackUrl;
    }

    if (error) {
      logger.error("OAuth error:", error);
      const callbackPageUrl = new URL("/auth/callback/google", request.url);
      callbackPageUrl.searchParams.set("error", error);
      callbackPageUrl.searchParams.set("message", error);
      return NextResponse.redirect(callbackPageUrl);
    }

    if (!code) {
      const callbackPageUrl = new URL("/auth/callback/google", request.url);
      callbackPageUrl.searchParams.set("error", "no_code");
      callbackPageUrl.searchParams.set("message", "Missing authorization code");
      return NextResponse.redirect(callbackPageUrl);
    }

    // Exchange code for tokens using the same redirect URI used in authorize step
    const redirectUri =
      parsedState?.redirectUri ||
      `${request.nextUrl.origin}/api/auth/callback/google`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    const normalizedEmail = sanitizeEmail(googleUser.email);
    const normalizedName = sanitizeName(googleUser.name);

    // Check if user exists or create new user
    let user = await getUserByEmail(normalizedEmail);

    if (!user) {
      // Create new user
      user = await createUser({
        email: normalizedEmail,
        name: normalizedName,
        picture: googleUser.picture,
        role: "user",
        provider: "google",
        googleId: googleUser.id,
      });
    } else {
      // Update last login
      await updateUserLastLogin(user._id.toString());
    }

    // Create JWT token
    const token = await createJWT(user);

    // Determine redirect URL
    let redirectUrl = callbackUrl;
    if (
      user.role === "admin" &&
      (redirectUrl === "/" || redirectUrl === "/auth")
    ) {
      redirectUrl = "/admin";
    }
    if (!redirectUrl || redirectUrl === "/auth") {
      redirectUrl = "/";
    }

    // Redirect to the client-side callback page with success parameters
    const callbackPageUrl = new URL("/auth/callback/google", request.url);
    callbackPageUrl.searchParams.set("auth", "success");
    callbackPageUrl.searchParams.set("callbackUrl", redirectUrl);

    // Create response with redirect to callback page
    const response = NextResponse.redirect(callbackPageUrl);

    // Set authentication cookie
    response.cookies.set("auth_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    logger.error("OAuth callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    const callbackPageUrl = new URL("/auth/callback/google", request.url);
    callbackPageUrl.searchParams.set("error", "authentication_failed");
    callbackPageUrl.searchParams.set("message", errorMessage);
    return NextResponse.redirect(callbackPageUrl);
  }
}
