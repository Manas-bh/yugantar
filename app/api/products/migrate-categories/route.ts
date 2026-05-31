import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { listProducts, updateProductById } from "@/lib/data/products";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/products/migrate-categories - Migrate category from string to array
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const auth = await requireAdminUser(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { confirm } = body;

    if (confirm !== "MIGRATE_CATEGORIES") {
      return NextResponse.json(
        { error: "Confirmation required" },
        { status: 400 }
      );
    }

    const products = await listProducts();

    logger.info(
      `Found ${products.length} products with string categories to migrate`
    );

    let migratedCount = 0;

    for (const product of products) {
      const normalizedCategories = Array.isArray(product.category)
        ? product.category.filter(Boolean)
        : [];

      if (normalizedCategories.length === 0) {
        const categoryArray = ["collections"];

        await updateProductById(product._id.toString(), {
          category: categoryArray,
        });

        logger.info(
          `Migrated product "${product.name}" - category reset to [${categoryArray.join(
            ", "
          )}]`
        );
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} products from string to array categories`,
      migratedCount,
      totalChecked: products.length,
    });
  } catch (error) {
    logger.error("Error migrating categories:", error);
    return NextResponse.json(
      { error: "Failed to migrate categories" },
      { status: 500 }
    );
  }
}
