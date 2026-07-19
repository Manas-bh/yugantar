import { type NextRequest, NextResponse } from "next/server";
import { authenticateUser, createJWT, getUserByEmail } from "@/lib/auth";
import { getAuthCookieOptions } from "@/lib/security/cookies";
import { logger } from "@/lib/logger";
import { validateBody } from "@/lib/validation/api";
import { loginBodySchema } from "@/lib/validation/schemas";
import {
  isValidEmail,
  sanitizeEmail,
} from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "auth:login" });
  try {
    const { data: body, error: validationError } = await validateBody(
      request,
      loginBodySchema
    );
    if (validationError) {
      return validationError;
    }

    const { email, password } = body;
    const normalizedEmail = sanitizeEmail(email);

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rateLimitKey = `auth:login:${clientIp}:${normalizedEmail}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      log.warn({ clientIp, email: normalizedEmail }, "Rate limit hit for login");
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)}`,
          },
        }
      );
    }

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const user = await authenticateUser(normalizedEmail, password);
    if (!user) {
      const existingUser = await getUserByEmail(normalizedEmail);
      if (
        existingUser &&
        existingUser.provider === "email" &&
        !existingUser.isEmailVerified
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Please verify your email with OTP before signing in",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.provider === "email" && !user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Please verify your email with OTP before signing in",
        },
        { status: 403 }
      );
    }

    const token = await createJWT(user);
    log.info({ userId: user._id.toString() }, "Login successful");

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    });

    response.cookies.set("auth_token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    log.error({ err: error }, "Login error");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
