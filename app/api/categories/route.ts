import { NextResponse } from "next/server";
import { listCategories } from "@/lib/data/categories";
import { isSupabaseConfigured, SupabaseConfigError } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ categories: [] });
    }

    const categories = await listCategories();

    // Return in shape compatible with lib/catalog.ts Category interface
    const normalizedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      isActive: cat.is_active,
      order: cat.order,
    }));

    return NextResponse.json({ categories: normalizedCategories });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ categories: [] });
    }
    logger.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}