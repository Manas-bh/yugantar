import { NextRequest, NextResponse } from "next/server";
import { getCurrentStock } from "@/lib/stock-utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const size = searchParams.get("size");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!size) {
      return NextResponse.json(
        { success: false, error: "Size is required" },
        { status: 400 }
      );
    }

    const currentStock = await getCurrentStock(productId, size);

    return NextResponse.json({
      success: true,
      productId,
      size,
      stock: currentStock,
    });
  } catch (error) {
    logger.error("Error getting current stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get current stock" },
      { status: 500 }
    );
  }
}
