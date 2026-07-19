import { NextRequest, NextResponse } from "next/server";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { requireAdminUser } from "@/lib/security/auth-guards";
import { logger } from "@/lib/logger";
import {
  parsePositiveInt,
  sanitizeLinkUrl,
  sanitizeName,
} from "@/lib/security/validation";
import { validateImageFiles } from "@/lib/security/upload";
import {
  createBannerRecord,
  deleteBannerRecord,
  findBannerById,
  listBanners,
  type BannerPosition,
  updateBannerRecord,
} from "@/lib/data/banners";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_POSITIONS: BannerPosition[] = [
  "home_hero",
  "home_feature",
  "collections_hero",
  "anime_hero",
  "meme_hero",
];

async function checkAdminAuth(request: NextRequest) {
  const auth = await requireAdminUser(request);
  return auth.error || auth.user;
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
    const filename = parts[parts.length - 1] || "";
    return filename.split(".")[0];
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "banners:get" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: { banners: [] } });
    }

    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");
    const admin = searchParams.get("admin") === "true";
    const limitParam = searchParams.get("limit");

    if (admin) {
      const authResult = await checkAdminAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    if (position && !VALID_POSITIONS.includes(position as BannerPosition)) {
      return NextResponse.json(
        { success: false, error: "Invalid banner position" },
        { status: 400 }
      );
    }

    const limit = limitParam
      ? parsePositiveInt(limitParam, 0, { min: 1, max: 50 })
      : undefined;
    const banners = await listBanners({
      position: position as BannerPosition,
      isActive: admin ? undefined : true,
      limit,
    });

    log.info({ count: banners.length }, "Fetched banners");

    return NextResponse.json({
      success: true,
      data: {
        banners: banners.map((banner) => ({
          _id: banner.id,
          name: banner.name,
          position: banner.position,
          image: banner.image,
          alt: banner.alt,
          title: banner.title || undefined,
          subtitle: banner.subtitle || undefined,
          ctaText: banner.cta_text || undefined,
          linkUrl: banner.link_url,
          order: banner.order,
          isActive: banner.is_active,
        })),
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true, data: { banners: [] } });
    }
    log.error({ err: error }, "Error fetching banners");
    return NextResponse.json(
      { success: false, error: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "banners:create" });
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
    const position = (formData.get("position") as string) as BannerPosition;
    const alt = ((formData.get("alt") as string) || "Homepage banner").trim();
    const title = ((formData.get("title") as string) || "").trim();
    const subtitle = ((formData.get("subtitle") as string) || "").trim();
    const ctaText = ((formData.get("ctaText") as string) || "").trim();
    const linkUrl = sanitizeLinkUrl(formData.get("linkUrl") || "/collections");
    const order = parsePositiveInt(formData.get("order"), 1, { min: 1, max: 999 });
    const isActive = (formData.get("isActive") as string) === "true";
    const imageFile = formData.get("image") as File | null;

    if (!name || !position || !VALID_POSITIONS.includes(position)) {
      return NextResponse.json(
        { success: false, error: "Name and a valid position are required" },
        { status: 400 }
      );
    }

    const imageFiles = imageFile && imageFile.size > 0 ? [imageFile] : [];
    const imageValidation = validateImageFiles(imageFiles);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, error: imageValidation.error || "Banner image is required" },
        { status: 400 }
      );
    }

    const validImageFile = imageFiles[0];
    if (!validImageFile) {
      return NextResponse.json(
        { success: false, error: "Banner image is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await validImageFile.arrayBuffer());
    const uploadResult = (await uploadImage(buffer, "homepage-banners")) as {
      secure_url: string;
    };

    const banner = await createBannerRecord({
      name,
      position,
      image: uploadResult.secure_url,
      alt,
      title: title || undefined,
      subtitle: subtitle || undefined,
      ctaText: ctaText || undefined,
      linkUrl,
      order,
      isActive,
    });

    log.info({ bannerId: banner.id, name }, "Banner created");

    return NextResponse.json({
      success: true,
      message: "Banner created successfully",
      data: {
        banner: {
          _id: banner.id,
          name: banner.name,
          position: banner.position,
          image: banner.image,
          alt: banner.alt,
          title: banner.title || undefined,
          subtitle: banner.subtitle || undefined,
          ctaText: banner.cta_text || undefined,
          linkUrl: banner.link_url,
          order: banner.order,
          isActive: banner.is_active,
        },
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error creating banner");
    return NextResponse.json(
      { success: false, error: "Failed to create banner" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const log = logger.child({ handler: "banners:update" });
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
    const bannerId = formData.get("bannerId") as string;
    const name = sanitizeName(formData.get("name"));
    const position = (formData.get("position") as string) as BannerPosition;
    const alt = ((formData.get("alt") as string) || "Homepage banner").trim();
    const title = ((formData.get("title") as string) || "").trim();
    const subtitle = ((formData.get("subtitle") as string) || "").trim();
    const ctaText = ((formData.get("ctaText") as string) || "").trim();
    const linkUrl = sanitizeLinkUrl(formData.get("linkUrl") || "/collections");
    const order = parsePositiveInt(formData.get("order"), 1, { min: 1, max: 999 });
    const isActive = (formData.get("isActive") as string) === "true";
    const imageFile = formData.get("image") as File | null;

    if (!bannerId || !name || !position || !VALID_POSITIONS.includes(position)) {
      return NextResponse.json(
        { success: false, error: "Banner ID, name and valid position are required" },
        { status: 400 }
      );
    }

    const existingBanner = await findBannerById(bannerId);
    if (!existingBanner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    let imageUrl = existingBanner.image;

    if (imageFile && imageFile.size > 0) {
      const imageValidation = validateImageFiles([imageFile]);
      if (!imageValidation.valid) {
        return NextResponse.json(
          { success: false, error: imageValidation.error || "Invalid image" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const uploadResult = (await uploadImage(buffer, "homepage-banners")) as {
        secure_url: string;
      };
      imageUrl = uploadResult.secure_url;

      try {
        const publicId = getPublicIdFromUrl(existingBanner.image);
        await deleteImage(publicId);
      } catch (error) {
        log.warn({ err: error }, "Failed to delete previous banner image");
      }
    }

    const updatedBanner = await updateBannerRecord(bannerId, {
      name,
      position,
      image: imageUrl,
      alt,
      title,
      subtitle,
      ctaText,
      linkUrl,
      order,
      isActive,
    });

    if (!updatedBanner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    log.info({ bannerId }, "Banner updated");

    return NextResponse.json({
      success: true,
      message: "Banner updated successfully",
      data: {
        banner: {
          _id: updatedBanner.id,
          name: updatedBanner.name,
          position: updatedBanner.position,
          image: updatedBanner.image,
          alt: updatedBanner.alt,
          title: updatedBanner.title || undefined,
          subtitle: updatedBanner.subtitle || undefined,
          ctaText: updatedBanner.cta_text || undefined,
          linkUrl: updatedBanner.link_url,
          order: updatedBanner.order,
          isActive: updatedBanner.is_active,
        },
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error updating banner");
    return NextResponse.json(
      { success: false, error: "Failed to update banner" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const log = logger.child({ handler: "banners:delete" });
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
    const bannerId = searchParams.get("bannerId");
    if (!bannerId) {
      return NextResponse.json(
        { success: false, error: "Banner ID is required" },
        { status: 400 }
      );
    }

    const banner = await findBannerById(bannerId);
    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    try {
      const publicId = getPublicIdFromUrl(banner.image);
      await deleteImage(publicId);
    } catch (error) {
      log.warn({ err: error }, "Failed to delete banner image from Cloudinary");
    }

    await deleteBannerRecord(bannerId);

    log.info({ bannerId }, "Banner deleted");

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error deleting banner");
    return NextResponse.json(
      { success: false, error: "Failed to delete banner" },
      { status: 500 }
    );
  }
}