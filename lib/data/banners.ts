import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureSupabaseConfigured } from "@/lib/supabase/server";

export type BannerPosition =
  | "home_hero"
  | "home_feature"
  | "collections_hero"
  | "anime_hero"
  | "meme_hero";

export interface BannerRecord {
  id: string;
  name: string;
  position: BannerPosition;
  image: string;
  alt: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  link_url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BANNERS_TABLE = "banners";

export async function listBanners(filters: {
  position?: BannerPosition;
  isActive?: boolean;
  limit?: number;
}): Promise<BannerRecord[]> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  let query = supabase.from(BANNERS_TABLE).select("*");

  if (filters.position) {
    query = query.eq("position", filters.position);
  }

  if (typeof filters.isActive === "boolean") {
    query = query.eq("is_active", filters.isActive);
  }

  query = query
    .order("position", { ascending: true })
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });

  if (typeof filters.limit === "number" && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.returns<BannerRecord[]>();
  if (error) {
    throw error;
  }

  return data || [];
}

export async function findBannerById(id: string): Promise<BannerRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(BANNERS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle<BannerRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function createBannerRecord(input: {
  name: string;
  position: BannerPosition;
  image: string;
  alt: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
}): Promise<BannerRecord> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload = {
    name: input.name,
    position: input.position,
    image: input.image,
    alt: input.alt,
    title: input.title || null,
    subtitle: input.subtitle || null,
    cta_text: input.ctaText || null,
    link_url: input.linkUrl,
    order: input.order,
    is_active: input.isActive,
  };

  const { data, error } = await supabase
    .from(BANNERS_TABLE)
    .insert(payload)
    .select("*")
    .single<BannerRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBannerRecord(
  id: string,
  updates: Partial<{
    name: string;
    position: BannerPosition;
    image: string;
    alt: string;
    title: string;
    subtitle: string;
    ctaText: string;
    linkUrl: string;
    order: number;
    isActive: boolean;
  }>
): Promise<BannerRecord | null> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.position !== undefined) payload.position = updates.position;
  if (updates.image !== undefined) payload.image = updates.image;
  if (updates.alt !== undefined) payload.alt = updates.alt;
  if (updates.title !== undefined) payload.title = updates.title || null;
  if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle || null;
  if (updates.ctaText !== undefined) payload.cta_text = updates.ctaText || null;
  if (updates.linkUrl !== undefined) payload.link_url = updates.linkUrl;
  if (updates.order !== undefined) payload.order = updates.order;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  const { data, error } = await supabase
    .from(BANNERS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle<BannerRecord>();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function deleteBannerRecord(id: string): Promise<boolean> {
  ensureSupabaseConfigured();

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from(BANNERS_TABLE)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}
