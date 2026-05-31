import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeEmail } from "@/lib/security/validation";
import { generateNumericOtp, hashOtp } from "@/lib/auth-otp";
import { logger } from "@/lib/logger";
import { validateBody } from "@/lib/validation/api";
import { otpResendBodySchema } from "@/lib/validation/schemas";
import {
  findAuthEmailOtpByEmail,
  updateAuthEmailOtpForResendById,
} from "@/lib/data/auth-email-otps";
import { sendSignupOtpEmail } from "@/lib/email/auth-otp";
import { SupabaseConfigError } from "@/lib/supabase/server";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 5;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { data: body, error: validationError } = await validateBody(request, otpResendBodySchema);
    if (validationError) {
      return validationError;
    }
    const { email } = body;
    const normalizedEmail = sanitizeEmail(email);
    const clientIp = getClientIp(request);

    const resendRateLimit = await checkRateLimit(`auth:register:resend:${clientIp}:${normalizedEmail}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!resendRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP resend attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((resendRateLimit.resetAt - Date.now()) / 1000)}`,
          },
        }
      );
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pending = await findAuthEmailOtpByEmail(normalizedEmail);
    if (!pending) {
      return NextResponse.json(
        { error: "No pending signup found for this email" },
        { status: 404 }
      );
    }

    if (pending.resend_count >= MAX_RESENDS) {
      return NextResponse.json(
        { error: "Maximum OTP resend attempts reached" },
        { status: 429 }
      );
    }

    const lastSentAtMs = new Date(pending.last_sent_at).getTime();
    const cooldownUntil = lastSentAtMs + RESEND_COOLDOWN_SECONDS * 1000;
    if (cooldownUntil > Date.now()) {
      const retryAfterSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Please wait ${retryAfterSeconds}s before requesting another OTP.` },
        {
          status: 429,
          headers: {
            "Retry-After": `${retryAfterSeconds}`,
          },
        }
      );
    }

    const otp = generateNumericOtp();
    const otpHash = hashOtp(normalizedEmail, otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await updateAuthEmailOtpForResendById(pending.id, {
      otpHash,
      expiresAt,
      nextResendCount: pending.resend_count + 1,
    });

    await sendSignupOtpEmail({
      email: pending.email,
      name: pending.name,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    return NextResponse.json({
      success: true,
      message: "OTP resent successfully",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable" },
        { status: 503 }
      );
    }

    logger.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
