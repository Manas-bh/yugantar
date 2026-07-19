import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { logger } from "@/lib/logger";
import {
  countProducts,
  findProductBySlug,
  listProducts,
} from "@/lib/data/products";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "products:get" });
  try {
    if (!isSupabaseConfigured()) {
      const slug = new URL(request.url).searchParams.get("slug");
      if (slug) {
        return NextResponse.json(
          { success: false, error: "Product not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: { products: [], total: 0, page: 1, limit: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isFeatured = searchParams.get("isFeatured");
    const isActive = searchParams.get("isActive");
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const admin = searchParams.get("admin") === "true";
    const slug = searchParams.get("slug");

    if (admin) {
      const auth = await requireAdminUser(request);
      if (auth.error) {
        return auth.error;
      }
    }

    const parsedLimit = Number.parseInt(limitParam || "", 10);
    const parsedPage = Number.parseInt(pageParam || "", 10);
    const hasValidLimit = Number.isFinite(parsedLimit) && parsedLimit > 0;
    const hasValidPage = Number.isFinite(parsedPage) && parsedPage > 0;

    const isFeaturedFilter =
      isFeatured !== null && isFeatured !== "" ? isFeatured === "true" : undefined;
    const isActiveFilter = admin
      ? isActive !== null && isActive !== ""
        ? isActive === "true"
        : undefined
      : isActive !== null && isActive !== ""
        ? isActive === "true"
        : true;

    if (slug) {
      const single = await findProductBySlug(slug);
      log.info({ slug, found: !!single }, "Product lookup by slug");
      return NextResponse.json(
        { success: true, data: { product: single } },
        {
          status: single ? 200 : 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    const products = await listProducts({
      category: category || undefined,
      isFeatured: isFeaturedFilter,
      isActive: isActiveFilter,
      limit: hasValidLimit ? parsedLimit : undefined,
      page: hasValidPage ? parsedPage : undefined,
    });

    const total = await countProducts({
      category: category || undefined,
      isFeatured: isFeaturedFilter,
      isActive: isActiveFilter,
    });

    log.info({ count: products.length, total }, "Products fetched");

    return NextResponse.json(
      {
        success: true,
        data: {
          products,
          total,
          page: hasValidPage ? parsedPage : 1,
          limit: hasValidLimit ? parsedLimit : products.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: true, data: { products: [], total: 0, page: 1, limit: 0 } }
      );
    }
    log.error({ err: error }, "Error fetching products");
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}