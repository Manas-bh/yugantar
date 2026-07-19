import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/security/auth-guards";
import { findOrdersByUserId } from "@/lib/data/orders";
import { logger } from "@/lib/logger";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "profile:get" });
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) {
      return auth.error;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: {
          profile: {
            name: auth.user.name,
            email: auth.user.email,
            phone: null,
            lastAddress: null,
          },
        },
      });
    }

    const orders = await findOrdersByUserId(auth.user._id.toString());
    const latestAddress = orders[0]?.address || null;

    log.info({ userId: auth.user._id.toString() }, "Profile fetched");

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          name: auth.user.name,
          email: auth.user.email,
          phone: latestAddress?.phone || null,
          lastAddress: latestAddress,
        },
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Profile service is temporarily unavailable" },
        { status: 503 }
      );
    }

    log.error({ err: error }, "Error fetching profile");
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
