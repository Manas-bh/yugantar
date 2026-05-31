import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import { Agent } from "https";

const httpsAgent = new Agent({ rejectUnauthorized: false });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid PIN code" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${code}`,
      // @ts-expect-error - node-fetch @types(RequestInit) omit cache
      { cache: "no-store", agent: httpsAgent }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Upstream lookup failed" },
      { status: 502 }
    );
  }
}