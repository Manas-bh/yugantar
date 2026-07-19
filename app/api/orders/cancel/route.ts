import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/auth";
import { restoreStock } from "@/lib/stock-utils";
import { requireAuthenticatedUser } from "@/lib/security/auth-guards";
import { sendOrderStatusUpdateEmail } from "@/lib/email/order-notifications";
import { logger } from "@/lib/logger";
import {
  findOrderByOrderId,
  updateOrderByOrderId,
} from "@/lib/data/orders";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "orders:cancel" });
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

    const { orderId, reason } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Find the order
    const order = await findOrderByOrderId(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (auth.user.role !== "admin" && order.userId !== auth.user._id.toString()) {
      return NextResponse.json(
        { success: false, error: "Not authorized to cancel this order" },
        { status: 403 }
      );
    }

    // Check if order can be cancelled
    if (order.orderStatus === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Order is already cancelled" },
        { status: 400 }
      );
    }

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot cancel order that has been shipped or delivered",
        },
        { status: 400 }
      );
    }

    // Only restore stock if payment was completed and order was confirmed
    let stockRestored = false;
    let stockErrors: string[] = [];

    if (
      order.payment.status === "completed" &&
      order.orderStatus === "confirmed"
    ) {
      const stockRestoration = await restoreStock(order.items);
      stockRestored = stockRestoration.success;
      stockErrors = stockRestoration.errors;

      if (!stockRestoration.success) {
        logger.error("Stock restoration errors:", stockRestoration.errors);
      }
    }

    // Update order status to cancelled
    const updatedOrder = await updateOrderByOrderId(orderId, {
      payment: order.payment,
      orderStatus: "cancelled",
      cancelReason: reason || "Customer requested cancellation",
      cancelledAt: new Date().toISOString(),
    });

    try {
      const orderOwner = await getUserById(String(order.userId || ""));

      if (!orderOwner?.email) {
        throw new Error("Order owner email not found");
      }

      await sendOrderStatusUpdateEmail({
        orderId,
        userEmail: orderOwner.email,
        userName: orderOwner.name,
        previousStatus: order.orderStatus,
        nextStatus: "cancelled",
      });
    } catch (emailError) {
      logger.error(
        `Order ${orderId} cancelled but status email failed:`,
        emailError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
      stockRestored,
      stockErrors,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Order cancellation error");
    return NextResponse.json(
      { success: false, error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
