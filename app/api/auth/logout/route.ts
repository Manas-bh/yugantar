import { type NextRequest, NextResponse } from "next/server"
import { getExpiredAuthCookieOptions } from "@/lib/security/cookies";
import { addToTokenDenylist } from "@/lib/security/token-denylist";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  // Server-side token invalidation: add to denylist so it can't be reused
  if (token) {
    try {
      await addToTokenDenylist(token);
    } catch (error) {
      console.error("Failed to add token to denylist:", error);
      // Continue with logout even if denylist fails
    }
  }

  const response = NextResponse.json({ success: true })

  // Clear the auth cookie
  response.cookies.set("auth_token", "", getExpiredAuthCookieOptions())

  return response
}
