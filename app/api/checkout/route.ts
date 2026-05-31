import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { validateStock } from "@/lib/stock-utils";
import { v4 as uuidv4 } from "uuid";
import { requireAuthenticatedUser } from "@/lib/security/auth-guards";
import {
  buildPricedCheckoutItems,
  computeOrderTotals,
} from "@/lib/services/pricing";
import { createOrderRecord } from "@/lib/data/orders";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

function hasValidAddress(address: unknown) {
  if (!address || typeof address !== "object") {
    return false;
  }

  const addressRecord = address as Record<string, unknown>;

  const requiredFields = [
    "fullName",
    "addressLine1",
    "city",
    "state",
    "pinCode",
    "phone",
  ];

  return requiredFields.every((field) => {
    const value = addressRecord[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const auth = await requireAuthenticatedUser(request);
    if (auth.error) {
      return auth.error;
    }

    const { items, address } = await request.json();
    const pricedItems = await buildPricedCheckoutItems(items);

    if (!pricedItems) {
      return NextResponse.json(
        { success: false, error: "Invalid order items" },
        { status: 400 }
      );
    }

    if (!hasValidAddress(address)) {
      return NextResponse.json(
        { success: false, error: "Invalid delivery address" },
        { status: 400 }
      );
    }

    const razorpayKeyId =
      process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        { success: false, error: "Payment gateway configuration missing" },
        { status: 500 }
      );
    }

    const { subtotal, shipping, total } = computeOrderTotals(pricedItems);

    // Validate stock availability before creating order
    const stockValidation = await validateStock(pricedItems);
    if (!stockValidation.valid) {
      const outOfStockDetails = stockValidation.outOfStockItems
        .map(
          (item) =>
            `Product ${item.productId} (Size: ${item.size}) - Requested: ${item.requestedQty}, Available: ${item.availableQty}`
        )
        .join(", ");

      return NextResponse.json(
        {
          success: false,
          error: "Insufficient stock",
          details:
            "Some items in your cart are out of stock or have insufficient quantity",
          outOfStockItems: stockValidation.outOfStockItems,
          message: `Out of stock: ${outOfStockDetails}`,
        },
        { status: 400 }
      );
    }

    const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yugantar.studio";

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const options = {
      amount: Math.round(total * 100), // Convert to smallest currency unit
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create order in database
    await createOrderRecord({
      userId: auth.user._id.toString(),
      orderId,
      items: pricedItems,
      address,
      payment: {
        razorpayOrderId: razorpayOrder.id,
        amount: total,
        currency: "INR",
        status: "pending",
      },
      orderStatus: "placed",
      subtotal,
      shipping,
      total,
    });

    return NextResponse.json({
      success: true,
      order: razorpayOrder,
      orderId,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
