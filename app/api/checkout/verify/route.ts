import { NextResponse } from "next/server";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/security/auth-guards";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sendNewOrderEmails } from "@/lib/email/order-notifications";
import { logger } from "@/lib/logger";
import { validateBody } from "@/lib/validation/api";
import { checkoutVerifyBodySchema } from "@/lib/validation/schemas";
import {
  convertReservation,
  releaseReservation,
} from "@/lib/data/stock-reservations";
import {
  findOrderByOrderIdForUser,
  updateOrderByOrderIdForUser,
} from "@/lib/data/orders";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

function isSignatureValid(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "checkout:verify" });
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

    const rateLimit = await checkRateLimit(
      `payment:verify:${auth.user._id.toString()}`,
      {
        limit: 30,
        windowMs: 10 * 60 * 1000,
      }
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many verification attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000
            )}`,
          },
        }
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await request.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing payment verification details" },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Payment gateway configuration missing" },
        { status: 500 }
      );
    }

    const order = await findOrderByOrderIdForUser(
      orderId,
      auth.user._id.toString()
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.orderStatus === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Order has already been cancelled" },
        { status: 400 }
      );
    }

    if (order.payment.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: "Payment order mismatch" },
        { status: 400 }
      );
    }

    if (order.payment.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        stockConverted: true,
        stockErrors: [],
      });
    }

    // Verify signature
    const isAuthentic = isSignatureValid(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (isAuthentic) {
      try {
        // Convert stock reservations to actual stock reduction
        await convertReservation(orderId);
      } catch (conversionError) {
        logger.error(
          { orderId, error: conversionError },
          "Stock reservation conversion failed after payment"
        );

        // Release the reservations to free up stock for other customers
        await releaseReservation(orderId);

        // Update order as failed due to stock issue
        await updateOrderByOrderIdForUser(
          orderId,
          auth.user._id.toString(),
          {
            payment: {
              ...order.payment,
              status: "failed",
            },
            orderStatus: "cancelled",
          }
        );

        return NextResponse.json(
          {
            success: false,
            error: "Stock unavailable after payment",
            message:
              "Your payment was received but the items went out of stock. A refund will be initiated.",
            stockConverted: false,
            stockErrors: [
              conversionError instanceof Error
                ? conversionError.message
                : "Stock conversion failed",
            ],
          },
          { status: 500 }
        );
      }

      // Update order with payment details
      await updateOrderByOrderIdForUser(orderId, auth.user._id.toString(), {
        payment: {
          ...order.payment,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "completed",
        },
        orderStatus: "confirmed",
      });

      // Send order confirmation email after successful payment
      try {
        const baseAppUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://yugantar.studio";
        await sendNewOrderEmails({
          orderId: order.orderId,
          userEmail: auth.user.email,
          userName: auth.user.name,
          items: order.items.map((item) => ({
            ...item,
            image: item.image,
            productUrl: `${baseAppUrl}/products/${item.productId}`,
          })),
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
        });
      } catch (emailError) {
        logger.error(
          { orderId: order.orderId, err: emailError },
          "Order verified but confirmation email failed"
        );
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified successfully",
        stockConverted: true,
        stockErrors: [],
      });
    } else {
      // Invalid signature — release reservations
      await releaseReservation(orderId);

      // Update order as failed
      await updateOrderByOrderIdForUser(orderId, auth.user._id.toString(), {
        payment: {
          ...order.payment,
          status: "failed",
        },
      });

      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Payment verification error");
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
