import { NextRequest, NextResponse } from "next/server";
import { restoreStock } from "@/lib/stock-utils";
import { getUserById } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/lib/security/auth-guards";
import { sendOrderStatusUpdateEmail } from "@/lib/email/order-notifications";
import {
  findAllOrders,
  findOrderByOrderId,
  findOrdersByUserId,
  updateOrderByOrderId,
} from "@/lib/data/orders";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = new Set([
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "orders:get" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const auth = await requireAuthenticatedUser(request);
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get("admin") === "true";

    let orders;
    if (isAdmin) {
      const adminAuth = await requireAdminUser(request);
      if (adminAuth.error) {
        return adminAuth.error;
      }

      orders = await findAllOrders();
    } else {
      orders = await findOrdersByUserId(auth.user._id.toString());
    }

    return NextResponse.json(
      { success: true, orders },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true, orders: [] });
    }
    log.error({ err: error }, "Error fetching orders");
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const log = logger.child({ handler: "orders:update" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const auth = await requireAdminUser(request);
    if (auth.error) {
      return auth.error;
    }

    const { orderId, orderStatus } = await request.json();

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!ORDER_STATUSES.has(orderStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid order status" },
        { status: 400 }
      );
    }

    const existingOrder = await findOrderByOrderId(orderId);

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (
      existingOrder.orderStatus === "cancelled" &&
      orderStatus !== "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cancelled orders cannot be moved to a different status",
        },
        { status: 400 }
      );
    }

    const setPayload: Record<string, unknown> = {
      orderStatus,
    };
    const unsetPayload: Record<string, 1> = {};
    let stockRestored = false;
    let stockErrors: string[] = [];

    if (orderStatus === "cancelled" && existingOrder.orderStatus !== "cancelled") {
      if (
        existingOrder.orderStatus === "shipped" ||
        existingOrder.orderStatus === "delivered"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot cancel an order that is shipped or delivered",
          },
          { status: 400 }
        );
      }

      if (
        existingOrder.payment.status === "completed" &&
        existingOrder.orderStatus === "confirmed"
      ) {
        const stockRestoration = await restoreStock(existingOrder.items);
        stockRestored = stockRestoration.success;
        stockErrors = stockRestoration.errors;

        if (!stockRestoration.success) {
          logger.error("Stock restoration errors:", stockRestoration.errors);
        }
      }

      setPayload.cancelReason = "Cancelled by admin";
      setPayload.cancelledAt = new Date().toISOString();
    } else if (orderStatus !== "cancelled") {
      unsetPayload.cancelReason = 1;
      unsetPayload.cancelledAt = 1;
    }

    const mergedPayment = { ...existingOrder.payment };
    const order = await updateOrderByOrderId(orderId, {
      payment: mergedPayment,
      orderStatus,
      cancelReason:
        orderStatus === "cancelled"
          ? (setPayload.cancelReason as string)
          : undefined,
      cancelledAt:
        orderStatus === "cancelled"
          ? (setPayload.cancelledAt as string)
          : undefined,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (existingOrder.orderStatus !== orderStatus) {
      try {
        const orderOwner = await getUserById(String(existingOrder.userId || ""));

        if (orderOwner?.email) {
          await sendOrderStatusUpdateEmail({
            orderId,
            userEmail: orderOwner.email,
            userName: orderOwner.name,
            previousStatus: existingOrder.orderStatus,
            nextStatus: orderStatus,
          });
        }
      } catch (emailError) {
        logger.error(
          `Order ${orderId} status updated but email failed:`,
          emailError
        );
      }
    }

    return NextResponse.json({ success: true, order, stockRestored, stockErrors });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error updating order");
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}
