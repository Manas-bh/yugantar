import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request);
    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
    });
  } catch (error) {
    logger.error("Database connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        message: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 }
    );
  }
}
