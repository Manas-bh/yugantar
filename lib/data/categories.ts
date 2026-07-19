import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureSupabaseConfigured } from "@/lib/supabase/server";

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES_TABLE = "categories";

export async function findCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle<CategoryRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function listCategories(): Promise<CategoryRecord[]> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select("*")
    .order("order", { ascending: true })
    .returns<CategoryRecord[]>();

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createCategoryRecord(input: {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  order: number;
}): Promise<CategoryRecord> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name,
    slug: input.slug,
    description: input.description,
    is_active: input.isActive,
    order: input.order,
  };

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .insert(payload)
    .select("*")
    .single<CategoryRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategoryRecord(
  id: string,
  updates: Partial<{
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    order: number;
  }>
): Promise<CategoryRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.order !== undefined) payload.order = updates.order;

  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle<CategoryRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function deleteCategoryRecord(id: string): Promise<boolean> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(CATEGORIES_TABLE)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}
