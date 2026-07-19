import { type NextRequest, NextResponse } from "next/server";
import { createJWT, createUser } from "@/lib/auth";
import { getAuthCookieOptions } from "@/lib/security/cookies";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeEmail } from "@/lib/security/validation";
import { hashOtp, isValidOtpFormat } from "@/lib/auth-otp";
import { logger } from "@/lib/logger";
import { validateBody } from "@/lib/validation/api";
import { otpVerifyBodySchema } from "@/lib/validation/schemas";
import {
  deleteAuthEmailOtpById,
  findAuthEmailOtpByEmail,
  incrementAuthEmailOtpAttemptById,
} from "@/lib/data/auth-email-otps";
import { SupabaseConfigError } from "@/lib/supabase/server";

const MAX_OTP_ATTEMPTS = 5;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "auth:register:verify-otp" });
  try {
    const { data: body, error: validationError } = await validateBody(request, otpVerifyBodySchema);
    if (validationError) {
      return validationError;
    }
    const { email, otp } = body;
    const normalizedEmail = sanitizeEmail(email);
    const otpValue = String(otp || "").trim();
    const clientIp = getClientIp(request);

    const verifyRateLimit = await checkRateLimit(`auth:register:verify:${clientIp}:${normalizedEmail}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!verifyRateLimit.allowed) {
      log.warn({ clientIp, email: normalizedEmail }, "Rate limit hit for OTP verify");
      return NextResponse.json(
        {
          success: false,
          error: "Too many verification attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((verifyRateLimit.resetAt - Date.now()) / 1000)}`,
          },
        }
      );
    }

    if (!normalizedEmail || !otpValue) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    if (!isValidOtpFormat(otpValue)) {
      return NextResponse.json(
        { success: false, error: "OTP must be a 6-digit code" },
        { status: 400 }
      );
    }

    const pending = await findAuthEmailOtpByEmail(normalizedEmail);
    if (!pending) {
      return NextResponse.json(
        { success: false, error: "No pending signup found for this email" },
        { status: 404 }
      );
    }

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await deleteAuthEmailOtpById(pending.id);
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (pending.attempt_count >= MAX_OTP_ATTEMPTS) {
      await deleteAuthEmailOtpById(pending.id);
      return NextResponse.json(
        { success: false, error: "Maximum OTP attempts exceeded. Please sign up again." },
        { status: 429 }
      );
    }

    const candidateHash = hashOtp(normalizedEmail, otpValue);
    if (candidateHash !== pending.otp_hash) {
      await incrementAuthEmailOtpAttemptById(pending.id, pending.attempt_count + 1);
      return NextResponse.json(
        { success: false, error: "Invalid OTP" },
        { status: 401 }
      );
    }

    const user = await createUser({
      email: pending.email,
      name: pending.name,
      password: pending.password_hash,
      provider: "email",
      role: "user",
      isEmailVerified: true,
    });

    await deleteAuthEmailOtpById(pending.id);

    const token = await createJWT(user);
    log.info({ userId: user._id.toString() }, "Registration complete");

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
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Authentication service is temporarily unavailable" },
        { status: 503 }
      );
    }

    log.error({ err: error }, "Verify OTP error");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}