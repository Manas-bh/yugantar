import { NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { reduceStock } from "@/lib/stock-utils";
import { findOrderByOrderId, updateOrderByOrderId } from "@/lib/data/orders";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

/**
 * Razorpay webhook signature verification.
 * Razorpay generates HMAC-SHA256 of the raw request body using the webhook secret.
 */
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Idempotency check: ensure we don't process the same event twice.
 * In production, use Redis with TTL. Here we use a simple in-memory Set
 * with a 24h cleanup interval as a fallback.
 */
const processedEvents = new Set<string>();
function isDuplicate(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  // Auto-cleanup after 24h to prevent unbounded growth
  setTimeout(() => processedEvents.delete(eventId), 24 * 60 * 60 * 1000);
  return false;
}

export async function POST(request: Request) {
  const log = logger.child({
    handler: "razorpay-webhook",
    traceId: crypto.randomUUID().slice(0, 8),
  });

  try {
    if (!isSupabaseConfigured()) {
      log.error("Supabase is not configured");
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !secret) {
      log.error("Missing signature or secret");
      return NextResponse.json(
        { success: false, error: "Missing signature or secret" },
        { status: 401 }
      );
    }

    const rawBody = await request.text();

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      log.error({ signature }, "Invalid webhook signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event;

    log.info({ eventId, eventType }, "Webhook received");

    if (isDuplicate(eventId)) {
      log.info({ eventId }, "Duplicate event, skipping");
      return NextResponse.json(
        { success: true, message: "Already processed" },
        { status: 200 }
      );
    }

    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const paymentEntity = event.payload?.payment?.entity;
        const orderEntity = event.payload?.order?.entity;

        if (!paymentEntity || !orderEntity) {
          log.error({ eventType }, "Missing payment or order entity");
          return NextResponse.json(
            { success: false, error: "Invalid payload" },
            { status: 400 }
          );
        }

        // Find our internal order by Razorpay order ID
        const internalOrder = await findOrderByOrderId(
          orderEntity.receipt || orderEntity.notes?.internalOrderId
        );

        if (!internalOrder) {
          log.error(
            { razorpayOrderId: orderEntity.id },
            "Internal order not found"
          );
          return NextResponse.json(
            { success: false, error: "Order not found" },
            { status: 404 }
          );
        }

        // Skip if already completed
        if (internalOrder.payment.status === "completed") {
          log.info(
            { orderId: internalOrder.orderId },
            "Payment already processed"
          );
          return NextResponse.json(
            { success: true, message: "Already completed" },
            { status: 200 }
          );
        }

        // Reduce stock
        const stockReduction = await reduceStock(internalOrder.items);
        if (!stockReduction.success) {
          log.error(
            { orderId: internalOrder.orderId, errors: stockReduction.errors },
            "Stock reduction failed after payment"
          );
          return NextResponse.json(
            { success: false, error: "Stock reduction failed" },
            { status: 500 }
          );
        }

        // Update order as confirmed
        await updateOrderByOrderId(internalOrder.orderId, {
          payment: {
            ...internalOrder.payment,
            razorpayPaymentId: paymentEntity.id,
            razorpayOrderId: orderEntity.id,
            status: "completed",
          },
          orderStatus: "confirmed",
        });

        log.info(
          { orderId: internalOrder.orderId, paymentId: paymentEntity.id },
          "Payment confirmed via webhook"
        );
        break;
      }

      case "payment.failed": {
        const paymentEntity = event.payload?.payment?.entity;
        const orderEntity = event.payload?.order?.entity;

        if (!orderEntity) {
          log.error({ eventType }, "Missing order entity");
          return NextResponse.json(
            { success: false, error: "Invalid payload" },
            { status: 400 }
          );
        }

        const internalOrder = await findOrderByOrderId(
          orderEntity.receipt || orderEntity.notes?.internalOrderId
        );

        if (internalOrder && internalOrder.payment.status !== "completed") {
          await updateOrderByOrderId(internalOrder.orderId, {
            payment: {
              ...internalOrder.payment,
              status: "failed",
            },
            orderStatus: "cancelled",
          });

          log.info(
            { orderId: internalOrder.orderId },
            "Payment failed, order cancelled"
          );
        }
        break;
      }

      default:
        log.info({ eventType }, "Unhandled event type");
    }

    return NextResponse.json(
      { success: true, message: "Webhook processed" },
      { status: 200 }
    );
  } catch (error) {
    log.error({ err: error }, "Webhook processing error");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
