import type { IOrder, IOrderItem } from "@/lib/domain/types";
import type { OrderStatus, OrderRecord, OrderPaymentRecord } from "@/lib/data/types";
import {
  mapOrderCreateToInsert,
  mapOrderRecordToIOrder,
  toRecordPaymentStatus,
} from "@/lib/data/mappers";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureSupabaseConfigured } from "@/lib/supabase/server";

const ORDERS_TABLE = "orders";

export async function createOrderRecord(input: {
  userId: string;
  orderId: string;
  items: IOrderItem[];
  address: IOrder["address"];
  payment: {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    status: "pending" | "completed" | "failed";
  };
  orderStatus: OrderStatus;
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
}): Promise<IOrder> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();

  const payload = mapOrderCreateToInsert({
    ...input,
    payment: {
      ...input.payment,
      status: toRecordPaymentStatus(input.payment.status),
    },
  });

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .insert(payload)
    .select("*")
    .single<OrderRecord>();

  if (error) {
    throw error;
  }

  return mapOrderRecordToIOrder(data);
}

export async function findOrderByOrderId(orderId: string): Promise<IOrder | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle<OrderRecord>();

  if (error) {
    throw error;
  }

  return data ? mapOrderRecordToIOrder(data) : null;
}

export async function findOrderByOrderIdForUser(
  orderId: string,
  userId: string
): Promise<IOrder | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select("*")
    .eq("order_id", orderId)
    .eq("user_id", userId)
    .maybeSingle<OrderRecord>();

  if (error) {
    throw error;
  }

  return data ? mapOrderRecordToIOrder(data) : null;
}

export async function findOrdersByUserId(userId: string): Promise<IOrder[]> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<OrderRecord[]>();

  if (error) {
    throw error;
  }

  return (data || []).map(mapOrderRecordToIOrder);
}

export async function findAllOrders(): Promise<IOrder[]> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .returns<OrderRecord[]>();

  if (error) {
    throw error;
  }

  return (data || []).map(mapOrderRecordToIOrder);
}

export async function updateOrderByOrderIdForUser(
  orderId: string,
  userId: string,
  updates: {
    payment?: Partial<OrderPaymentRecord>;
    orderStatus?: OrderStatus;
    cancelReason?: string;
    cancelledAt?: string;
  }
): Promise<IOrder | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();

  const payload: Record<string, unknown> = {};

  if (updates.payment) {
    payload.payment = updates.payment;
  }

  if (updates.orderStatus) {
    payload.order_status = updates.orderStatus;
  }

  if (updates.cancelReason !== undefined) {
    payload.cancel_reason = updates.cancelReason;
  }

  if (updates.cancelledAt !== undefined) {
    payload.cancelled_at = updates.cancelledAt;
  }

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(payload)
    .eq("order_id", orderId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle<OrderRecord>();

  if (error) {
    throw error;
  }

  return data ? mapOrderRecordToIOrder(data) : null;
}

export async function updateOrderByOrderId(
  orderId: string,
  updates: {
    payment?: Partial<OrderPaymentRecord>;
    orderStatus?: OrderStatus;
    cancelReason?: string;
    cancelledAt?: string;
  }
): Promise<IOrder | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.payment) {
    payload.payment = updates.payment;
  }

  if (updates.orderStatus) {
    payload.order_status = updates.orderStatus;
  }

  if (updates.cancelReason !== undefined) {
    payload.cancel_reason = updates.cancelReason;
  }

  if (updates.cancelledAt !== undefined) {
    payload.cancelled_at = updates.cancelledAt;
  }

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(payload)
    .eq("order_id", orderId)
    .select("*")
    .maybeSingle<OrderRecord>();

  if (error) {
    throw error;
  }

  return data ? mapOrderRecordToIOrder(data) : null;
}
