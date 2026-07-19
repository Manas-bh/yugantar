import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  logger.info({ handler: "auth:register" }, "Disabled registration endpoint hit");
  return NextResponse.json(
    {
      success: false,
      error:
        "Direct registration is disabled. Use /api/auth/register/start and verify OTP to complete signup.",
      code: "ENDPOINT_DISABLED",
    },
    { status: 410 }
  );
}
