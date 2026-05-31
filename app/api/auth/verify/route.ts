import { logger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify the token
    const payload = await verifyJWT(token)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    })
  } catch (error) {
    logger.error("Token verification error:", error)
    return NextResponse.json({ error: "Token verification failed" }, { status: 401 })
  }
}
