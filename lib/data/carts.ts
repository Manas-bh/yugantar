import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureSupabaseConfigured } from "@/lib/supabase/server";

export interface CartItemRecord {
  productId: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  category?: string;
}

export interface CartRecord {
  id: string;
  user_id: string | null;
  session_id: string | null;
  items: CartItemRecord[];
  created_at: string;
  updated_at: string;
}

const CARTS_TABLE = "carts";

export async function findCartByUserId(userId: string): Promise<CartRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(CARTS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<CartRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function findCartBySessionId(
  sessionId: string
): Promise<CartRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(CARTS_TABLE)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle<CartRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function createCart(input: {
  userId?: string;
  sessionId?: string;
  items?: CartItemRecord[];
}): Promise<CartRecord> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload = {
    user_id: input.userId || null,
    session_id: input.sessionId || null,
    items: input.items || [],
  };

  const { data, error } = await supabase
    .from(CARTS_TABLE)
    .insert(payload)
    .select("*")
    .single<CartRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCartById(
  cartId: string,
  updates: Partial<{
    userId: string | null;
    sessionId: string | null;
    items: CartItemRecord[];
  }>
): Promise<CartRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.userId !== undefined) payload.user_id = updates.userId;
  if (updates.sessionId !== undefined) payload.session_id = updates.sessionId;
  if (updates.items !== undefined) payload.items = updates.items;

  const { data, error } = await supabase
    .from(CARTS_TABLE)
    .update(payload)
    .eq("id", cartId)
    .select("*")
    .maybeSingle<CartRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function deleteCartById(cartId: string): Promise<boolean> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(CARTS_TABLE)
    .delete({ count: "exact" })
    .eq("id", cartId);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}

export async function deleteCartBySessionId(sessionId: string): Promise<boolean> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(CARTS_TABLE)
    .delete({ count: "exact" })
    .eq("session_id", sessionId);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}
