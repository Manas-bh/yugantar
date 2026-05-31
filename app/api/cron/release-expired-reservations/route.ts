import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { releaseExpiredReservations } from "@/lib/data/stock-reservations";

/**
 * Cron job: Release expired stock reservations every minute.
 *
 * When a customer starts checkout but never completes payment within 15 minutes,
 * their reserved stock should be returned to the available pool so other
 * customers can purchase it.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [
 * Schedule: every 1 minute.
 *   ]
 * }
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const releasedCount = await releaseExpiredReservations();

    if (releasedCount > 0) {
      logger.info(
        { count: releasedCount },
        "Released expired stock reservations"
      );
    }

    return NextResponse.json({
      success: true,
      released: releasedCount,
    });
  } catch (error) {
    logger.error(
      { err: error },
      "Cron: failed to release expired reservations"
    );
    return NextResponse.json(
      { success: false, error: "Failed to release expired reservations" },
      { status: 500 }
    );
  }
}
