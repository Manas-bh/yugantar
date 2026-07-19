import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "auth:verify" });
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      )
    }

    const payload = await verifyJWT(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      )
    }

    log.info({ userId: payload.userId }, "Token verified");

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    })
  } catch (error) {
    log.error({ err: error }, "Token verification error")
    return NextResponse.json(
      { success: false, error: "Token verification failed" },
      { status: 401 }
    )
  }
}