import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/init-db";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request);
    if (auth.error) {
      return auth.error;
    }

    await initializeDatabase();
    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
    });
  } catch (error) {
    logger.error("Database initialization error:", error);
    return NextResponse.json(
      { success: false, error: "Database initialization failed" },
      { status: 500 }
    );
  }
}
