import { NextResponse } from "next/server";
import { listCategories } from "@/lib/data/categories";
import { isSupabaseConfigured, SupabaseConfigError } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = logger.child({ handler: "categories:get" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: { categories: [] } });
    }

    const categories = await listCategories();

    const normalizedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      isActive: cat.is_active,
      order: cat.order,
    }));

    log.info({ count: categories.length }, "Categories fetched");

    return NextResponse.json({
      success: true,
      data: { categories: normalizedCategories },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true, data: { categories: [] } });
    }
    log.error({ err: error }, "Error fetching categories");
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}