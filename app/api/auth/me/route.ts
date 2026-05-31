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
        { error: "Too many requests. Please try again later." },
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
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Check if token was invalidated via logout
    if (isTokenDenied(token)) {
      const response = NextResponse.json(
        { error: "Token has been revoked" },
        { status: 401 }
      );
      response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
      return response;
    }

    const user = await getUserFromToken(token);
    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
      response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
      return response;
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Auth check error:", error);

    // Clear invalid cookie on error
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    response.cookies.set("auth_token", "", getExpiredAuthCookieOptions());
    return response;
  }
}
