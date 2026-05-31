import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { sanitizeCallbackUrl } from "@/lib/security/validation";
import { logger } from "@/lib/logger";

const jwtSecretValue = process.env.JWT_SECRET;

if (!jwtSecretValue || jwtSecretValue.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

// List of protected routes
const protectedRoutes = ["/admin", "/profile", "/address", "/checkout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      // Redirect to /auth with callbackUrl
      const callbackUrl = encodeURIComponent(sanitizeCallbackUrl(pathname));
      return NextResponse.redirect(
        new URL(`/auth?callbackUrl=${callbackUrl}`, request.url)
      );
    }

    // For admin, enforce role-based access only
    if (pathname.startsWith("/admin")) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        if (payload.role !== "admin") {
          const callbackUrl = encodeURIComponent(sanitizeCallbackUrl(pathname));
          return NextResponse.redirect(
            new URL(`/auth?callbackUrl=${callbackUrl}`, request.url)
          );
        }
      } catch (error) {
        logger.error("JWT verification error in middleware:", error);
        const callbackUrl = encodeURIComponent(sanitizeCallbackUrl(pathname));
        return NextResponse.redirect(
          new URL(`/auth?callbackUrl=${callbackUrl}`, request.url)
        );
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/address/:path*",
    "/checkout/:path*",
  ],
};
