import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import { Agent } from "https";
import { logger } from "@/lib/logger";

const httpsAgent = new Agent({ rejectUnauthorized: false });

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "pincode:lookup" });
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: "Invalid PIN code" },
      { status: 400 }
    );
  }

  try {
    log.info({ pincode: code }, "Looking up PIN code");
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${code}`,
      // @ts-expect-error - node-fetch @types(RequestInit) omit cache
      { cache: "no-store", agent: httpsAgent }
    );

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    log.error({ err: error, pincode: code }, "Upstream PIN code lookup failed");
    return NextResponse.json(
      { success: false, error: "Upstream lookup failed" },
      { status: 502 }
    );
  }
}