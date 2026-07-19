import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapProductRecordToIProduct } from "@/lib/data/mappers";
import type { IProduct } from "@/lib/domain/types";
import type { ProductRecord } from "@/lib/data/types";

const PRODUCTS_TABLE = "products";

/**
 * Update only the stock field of a product.
 * Extracted from products.ts to follow SRP (stock concerns are separate
 * from general product CRUD).
 */
export async function updateProductStockById(
  productId: string,
  stock: Record<string, number>
): Promise<IProduct | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock })
    .eq("id", productId)
    .select("*")
    .maybeSingle<ProductRecord>();

  if (error) {
    throw error;
  }

  return data ? mapProductRecordToIProduct(data) : null;
}
