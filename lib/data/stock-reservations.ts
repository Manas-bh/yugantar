import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const RESERVATION_EXPIRY_MINUTES = 15;

export function getReservationExpiry(): Date {
  return new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);
}

export type OutOfStockItem = {
  productId: string;
  size: string;
  requestedQty: number;
  availableQty: number;
};

export type ReserveStockResult =
  | { success: true; expiresAt: string }
  | { success: false; expiresAt: string; outOfStockItems: OutOfStockItem[] };

export async function reserveStockForOrder(
  orderId: string,
  items: Array<{ productId: string; size: string; quantity: number }>
): Promise<ReserveStockResult> {
  const supabase = getSupabaseAdminClient();
  const expiresAt = getReservationExpiry().toISOString();
  const outOfStockItems: OutOfStockItem[] = [];

  for (const item of items) {
    const { data, error } = await supabase.rpc("reserve_stock", {
      p_order_id: orderId,
      p_product_id: item.productId,
      p_size: item.size,
      p_quantity: item.quantity,
      p_expires_at: expiresAt,
    });

    if (error) {
      logger.error({ err: error, orderId, item }, "RPC reserve_stock failed");
      throw error;
    }

    if (data && !data.success) {
      outOfStockItems.push({
        productId: item.productId,
        size: item.size,
        requestedQty: item.quantity,
        availableQty: data.available || 0,
      });
    }
  }

  if (outOfStockItems.length > 0) {
    // Release any successful reservations for this order
    await releaseReservation(orderId);
    return { success: false, expiresAt, outOfStockItems };
  }

  return { success: true, expiresAt };
}

export async function convertReservation(orderId: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("convert_reservation", {
    p_order_id: orderId,
  });

  if (error) {
    logger.error({ err: error, orderId }, "RPC convert_reservation failed");
    throw error;
  }

  if (data && !data.success) {
    throw new Error(data.message || "Stock conversion failed");
  }

  return data?.message ?? "Converted successfully";
}

export async function releaseReservation(orderId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("release_reservation", {
    p_order_id: orderId,
  });

  if (error) {
    logger.error({ err: error, orderId }, "RPC release_reservation failed");
    throw error;
  }

  return data?.released ?? 0;
}

export async function releaseExpiredReservations(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("release_expired_reservations");

  if (error) {
    logger.error({ err: error }, "Failed to release expired reservations");
    throw error;
  }

  return data ?? 0;
}

export async function getAvailableStock(
  productId: string,
  size: string
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("available_stock", {
    p_product_id: productId,
    p_size: size,
  });

  if (error) {
    logger.error({ err: error, productId, size }, "RPC available_stock failed");
    throw error;
  }

  return data ?? 0;
}
