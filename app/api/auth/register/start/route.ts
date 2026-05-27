import { type NextRequest, NextResponse } from "next/server";
import { getUserByEmail, hashPassword } from "@/lib/auth";
import { sanitizeEmail, sanitizeName, isValidEmail } from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { SupabaseConfigError } from "@/lib/supabase/server";
import { generateNumericOtp, hashOtp } from "@/lib/auth-otp";
import { upsertAuthEmailOtp } from "@/lib/data/auth-email-otps";
import { sendSignupOtpEmail } from "@/lib/email/auth-otp";

const OTP_EXPIRY_MINUTES = 10;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    const normalizedEmail = sanitizeEmail(email);
    const normalizedName = sanitizeName(name);
    const rawPassword = String(password || "");
    const clientIp = getClientIp(request);

    const startRateLimit = checkRateLimit(`auth:register:start:${clientIp}:${normalizedEmail}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!startRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((startRateLimit.resetAt - Date.now()) / 1000)}`,
          },
        }
      );
    }

    if (!normalizedEmail || !normalizedName || !rawPassword) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (rawPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Enforce password complexity: at least one uppercase, one lowercase, one digit, one special character
    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;
    if (!passwordComplexityRegex.test(rawPassword)) {
      return NextResponse.json(
        { error: "Password must include uppercase, lowercase, number, and special character" },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const otp = generateNumericOtp();
    const otpHash = hashOtp(normalizedEmail, otp);
    const passwordHash = await hashPassword(rawPassword);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await upsertAuthEmailOtp({
      email: normalizedEmail,
      name: normalizedName,
      passwordHash,
      otpHash,
      expiresAt,
    });

    await sendSignupOtpEmail({
      email: normalizedEmail,
      name: normalizedName,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable" },
        { status: 503 }
      );
    }

    console.error("Register start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
