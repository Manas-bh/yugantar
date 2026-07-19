import { NextRequest, NextResponse } from "next/server";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { logger } from "@/lib/logger";
import {
  createProductRecord,
  deleteProductById,
  findProductById,
  findProductBySlug,
  updateProductById,
} from "@/lib/data/products";
import { updateProductStockById } from "@/lib/data/stock";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";
import {
  normalizeStringList,
  parsePrice,
  sanitizeName,
  validateImageUrls,
} from "@/lib/security/validation";
import { validateImageFiles } from "@/lib/security/upload";

export const dynamic = "force-dynamic";

async function checkAdminAuth(request: NextRequest) {
  const auth = await requireAdminUser(request);
  return auth.error || auth.user;
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getPublicIdFromUrl(url: string): string {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      const pathParts = parts.slice(uploadIndex + 2);
      const fullPath = pathParts.join("/");
      return fullPath.replace(/\.[^/.]+$/, "");
    }
    const filename = parts[parts.length - 1];
    return filename.split(".")[0];
  } catch (error) {
    logger.warn({ err: error, url }, "Error extracting public ID from URL");
    return url;
  }
}

// POST /api/products/admin
export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "products:admin:create" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const formData = await request.formData();
    const name = sanitizeName(formData.get("name"));
    const description = String(formData.get("description") || "").trim();
    const price = parsePrice(formData.get("price"));
    const originalPrice = formData.get("originalPrice")
      ? parsePrice(formData.get("originalPrice"))
      : undefined;
    const category = normalizeStringList(formData.get("category"));
    const tags = normalizeStringList(formData.get("tags"));
    const sizes = normalizeStringList(formData.get("sizes"));
    const colors = normalizeStringList(formData.get("colors"));

    const sizeStockString = formData.get("sizeStock") as string;
    let sizeStockData: Record<string, unknown> = {};
    try {
      sizeStockData = sizeStockString ? JSON.parse(sizeStockString) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid stock data format" },
        { status: 400 }
      );
    }

    const stock: { [size: string]: number } = {};
    sizes.forEach((size) => {
      const rawValue = sizeStockData[size];
      const parsedValue = Number.parseInt(String(rawValue ?? "0"), 10);
      stock[size] = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
    });

    const isFeatured = formData.get("isFeatured") === "true";
    const hostedImageUrls = normalizeStringList(formData.get("imageUrls"));

    if (
      originalPrice !== undefined &&
      (Number.isNaN(originalPrice) || originalPrice < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Original price must be a valid non-negative number" },
        { status: 400 }
      );
    }

    if (
      !name ||
      !description ||
      Number.isNaN(price) ||
      price <= 0 ||
      !category.length ||
      !sizes.length
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const slug = createSlug(name);
    const existingProduct = await findProductBySlug(slug);
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: "A product with this name already exists" },
        { status: 400 }
      );
    }

    const imageFiles = formData.getAll("images") as File[];
    const validImageFiles = (imageFiles || []).filter(
      (file) => file && file.size > 0
    );

    const imageValidation = validateImageFiles(validImageFiles);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, error: imageValidation.error || "Invalid images" },
        { status: 400 }
      );
    }

    const imageUrls: string[] = [];

    if (hostedImageUrls.length > 0) {
      if (!validateImageUrls(hostedImageUrls)) {
        return NextResponse.json(
          { success: false, error: "Invalid hosted image URLs" },
          { status: 400 }
        );
      }
      imageUrls.push(...hostedImageUrls);
    } else {
      for (const file of validImageFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = (await uploadImage(buffer, "tshirt-products")) as { secure_url: string };
        imageUrls.push(result.secure_url);
      }
    }

    const product = await createProductRecord({
      name,
      slug,
      description,
      price,
      originalPrice,
      images: imageUrls,
      category,
      tags,
      sizes,
      colors,
      stock,
      isFeatured,
      isActive: true,
      rating: 0,
      reviews: 0,
    });

    log.info({ productId: product.id, name }, "Product created");

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        data: { product },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error creating product");
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/admin
export async function PUT(request: NextRequest) {
  const log = logger.child({ handler: "products:admin:update" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    const name = sanitizeName(formData.get("name"));
    const description = String(formData.get("description") || "").trim();
    const price = parsePrice(formData.get("price"));
    const originalPrice = formData.get("originalPrice")
      ? parsePrice(formData.get("originalPrice"))
      : undefined;
    const category = normalizeStringList(formData.get("category"));
    const tags = normalizeStringList(formData.get("tags"));
    const sizes = normalizeStringList(formData.get("sizes"));
    const colors = normalizeStringList(formData.get("colors"));

    const sizeStockString = formData.get("sizeStock") as string;
    let sizeStockData: Record<string, unknown> = {};
    try {
      sizeStockData = sizeStockString ? JSON.parse(sizeStockString) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid stock data format" },
        { status: 400 }
      );
    }

    const stock: { [size: string]: number } = {};
    sizes.forEach((size) => {
      const rawValue = sizeStockData[size];
      const parsedValue = Number.parseInt(String(rawValue ?? "0"), 10);
      stock[size] = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
    });

    const isFeatured = formData.get("isFeatured") === "true";
    const isActive = formData.get("isActive") === "true";
    const keepExistingImages = formData.get("keepExistingImages") === "true";
    const hostedImageUrls = normalizeStringList(formData.get("imageUrls"));

    if (
      originalPrice !== undefined &&
      (Number.isNaN(originalPrice) || originalPrice < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Original price must be a valid non-negative number" },
        { status: 400 }
      );
    }

    if (
      !productId ||
      !name ||
      !description ||
      Number.isNaN(price) ||
      price <= 0 ||
      !category.length ||
      !sizes.length
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields or invalid data" },
        { status: 400 }
      );
    }

    const existingProduct = await findProductById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const slug = createSlug(name);

    if (slug !== existingProduct.slug) {
      const conflictingProduct = await findProductBySlug(slug);
      if (
        conflictingProduct &&
        conflictingProduct._id.toString() !== existingProduct._id.toString()
      ) {
        return NextResponse.json(
          { success: false, error: "A product with this name already exists" },
          { status: 400 }
        );
      }
    }

    let imageUrls = existingProduct.images;

    if (!keepExistingImages) {
      const newImageFiles = formData.getAll("newImages") as File[];
      const validNewImageFiles = (newImageFiles || []).filter(
        (file) => file && file.size > 0
      );

      const imageValidation = validateImageFiles(validNewImageFiles);
      if (!imageValidation.valid && hostedImageUrls.length === 0) {
        return NextResponse.json(
          { success: false, error: imageValidation.error || "Invalid images" },
          { status: 400 }
        );
      }

      if (hostedImageUrls.length > 0) {
        if (!validateImageUrls(hostedImageUrls)) {
          return NextResponse.json(
            { success: false, error: "Invalid hosted image URLs" },
            { status: 400 }
          );
        }
        imageUrls = hostedImageUrls;
      } else if (validNewImageFiles.length > 0) {
        for (const oldImageUrl of existingProduct.images) {
          try {
            const publicId = getPublicIdFromUrl(oldImageUrl);
            await deleteImage(publicId);
          } catch (error) {
            log.warn({ err: error }, "Failed to delete old image");
          }
        }

        imageUrls = [];
        for (const file of validNewImageFiles) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = (await uploadImage(buffer, "tshirt-products")) as { secure_url: string };
          imageUrls.push(result.secure_url);
        }
      }
    } else if (hostedImageUrls.length > 0) {
      if (!validateImageUrls(hostedImageUrls)) {
        return NextResponse.json(
          { success: false, error: "Invalid hosted image URLs" },
          { status: 400 }
        );
      }
      imageUrls = hostedImageUrls;
    }

    const updatedProduct = await updateProductById(productId, {
      name,
      slug,
      description,
      price,
      originalPrice: originalPrice ?? null,
      images: imageUrls,
      category,
      tags,
      sizes,
      colors,
      isFeatured,
      isActive,
    });

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await updateProductStockById(productId, stock);

    log.info({ productId }, "Product updated");

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        data: { product: updatedProduct },
      }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error updating product");
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products/admin
export async function DELETE(request: NextRequest) {
  const log = logger.child({ handler: "products:admin:delete" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await findProductById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    for (const imageUrl of product.images) {
      try {
        const publicId = getPublicIdFromUrl(imageUrl);
        await deleteImage(publicId);
      } catch (error) {
        log.warn({ err: error }, "Failed to delete image");
      }
    }

    const deleted = await deleteProductById(productId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    log.info({ productId }, "Product deleted");

    return NextResponse.json(
      { success: true, message: "Product deleted successfully" }
    );
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error deleting product");
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}