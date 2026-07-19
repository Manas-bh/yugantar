import type { IProduct } from "@/lib/domain/types";
import type { ProductRecord } from "@/lib/data/types";
import { mapProductRecordToIProduct } from "@/lib/data/mappers";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const PRODUCTS_TABLE = "products";

type ProductListFilters = {
  category?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  limit?: number;
  page?: number;
};

export async function findProductById(id: string): Promise<IProduct | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle<ProductRecord>();

  if (error) {
    throw error;
  }

  return data ? mapProductRecordToIProduct(data) : null;
}

export async function findProductBySlug(slug: string): Promise<IProduct | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle<ProductRecord>();

  if (error) {
    throw error;
  }

  return data ? mapProductRecordToIProduct(data) : null;
}

export async function listProductsByCategory(category: string): Promise<IProduct[]> {
  return listProducts({ category, isActive: true });
}

export async function countProducts(filters: {
  category?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(PRODUCTS_TABLE).select("id", {
    count: "exact",
    head: true,
  });

  if (filters.category) {
    query = query.contains("category", [filters.category]);
  }

  if (typeof filters.isFeatured === "boolean") {
    query = query.eq("is_featured", filters.isFeatured);
  }

  if (typeof filters.isActive === "boolean") {
    query = query.eq("is_active", filters.isActive);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count || 0;
}

export async function listProducts(filters: ProductListFilters = {}): Promise<IProduct[]> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  let query = supabase.from(PRODUCTS_TABLE).select("*");

  if (filters.category) {
    query = query.contains("category", [filters.category]);
  }

  if (typeof filters.isFeatured === "boolean") {
    query = query.eq("is_featured", filters.isFeatured);
  }

  if (typeof filters.isActive === "boolean") {
    query = query.eq("is_active", filters.isActive);
  }

  query = query.order("created_at", { ascending: false });

  if (typeof filters.limit === "number" && filters.limit > 0) {
    if (typeof filters.page === "number" && filters.page > 0) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit - 1;
      query = query.range(start, end);
    } else {
      query = query.limit(filters.limit);
    }
  }

  const { data, error } = await query.returns<ProductRecord[]>();
  if (error) {
    throw error;
  }

  return (data || []).map(mapProductRecordToIProduct);
}

export async function clearAllProducts(): Promise<number> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(PRODUCTS_TABLE)
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function createProductRecord(input: {
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string[];
  tags: string[];
  sizes: string[];
  colors: string[];
  stock: Record<string, number>;
  isFeatured: boolean;
  isActive?: boolean;
  rating?: number;
  reviews?: number;
}): Promise<IProduct> {
  const supabase = getSupabaseAdminClient();
  const payload = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    price: input.price,
    original_price: input.originalPrice ?? null,
    images: input.images,
    category: input.category,
    tags: input.tags,
    sizes: input.sizes,
    colors: input.colors,
    stock: input.stock,
    is_active: input.isActive ?? true,
    is_featured: input.isFeatured,
    rating: input.rating ?? 0,
    reviews: input.reviews ?? 0,
  };

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(payload)
    .select("*")
    .single<ProductRecord>();

  if (error) {
    throw error;
  }

  return mapProductRecordToIProduct(data);
}

export async function updateProductById(
  productId: string,
  updates: Partial<{
    name: string;
    slug: string;
    description: string;
    price: number;
    originalPrice: number | null;
    images: string[];
    category: string[];
    tags: string[];
    sizes: string[];
    colors: string[];
    stock: Record<string, number>;
    isFeatured: boolean;
    isActive: boolean;
    rating: number;
    reviews: number;
  }>
): Promise<IProduct | null> {
  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.originalPrice !== undefined)
    payload.original_price = updates.originalPrice;
  if (updates.images !== undefined) payload.images = updates.images;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.sizes !== undefined) payload.sizes = updates.sizes;
  if (updates.colors !== undefined) payload.colors = updates.colors;
  if (updates.isFeatured !== undefined) payload.is_featured = updates.isFeatured;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.rating !== undefined) payload.rating = updates.rating;
  if (updates.reviews !== undefined) payload.reviews = updates.reviews;

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update(payload)
    .eq("id", productId)
    .select("*")
    .maybeSingle<ProductRecord>();

  if (error) {
    throw error;
  }

  return data ? mapProductRecordToIProduct(data) : null;
}

export async function deleteProductById(productId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(PRODUCTS_TABLE)
    .delete({ count: "exact" })
    .eq("id", productId);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}
