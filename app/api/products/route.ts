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

// GET /api/products - Get all products with optional filtering
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      if (new URL(request.url).searchParams.get("slug")) {
        return NextResponse.json({ product: null }, { status: 404 });
      }

      return NextResponse.json({ products: [], total: 0, page: 1, limit: 0 });
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

    const products = slug
      ? []
      : await listProducts({
          category: category || undefined,
          isFeatured: isFeaturedFilter,
          isActive: isActiveFilter,
          limit: hasValidLimit ? parsedLimit : undefined,
          page: hasValidPage ? parsedPage : undefined,
        });

    if (slug) {
      const single = await findProductBySlug(slug);
      return NextResponse.json(
        { product: single },
        {
          status: single ? 200 : 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Get total count for pagination
    const total = await countProducts({
      category: category || undefined,
      isFeatured: isFeaturedFilter,
      isActive: isActiveFilter,
    });

    return NextResponse.json(
      {
        products,
        total,
        page: hasValidPage ? parsedPage : 1,
        limit: hasValidLimit ? parsedLimit : products.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ products: [], total: 0, page: 1, limit: 0 });
    }
    logger.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
