import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { getExpiredAuthCookieOptions } from "@/lib/security/cookies";
import { isTokenDenied } from "@/lib/security/token-denylist";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = await checkRateLimit(`auth:me:${clientIp}`, {
      limit: 60,
      windowMs: 60 * 1000, // 60 requests per minute
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)}`,
          },
        }
      );
    }

    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 401 }
      );
    }

    if (isTokenDenied(token)) {
      const response = NextResponse.json(
        { success: false, error: "Token has been revoked" },
        { status: 401 }
      );
      response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
      return response;
    }

    const user = await getUserFromToken(token);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
      response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
      return response;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Auth check error");

    const response = NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
    response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
    return response;
  }
}
