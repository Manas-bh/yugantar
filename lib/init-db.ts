import { initializeDefaultAdmin as initializeAuthAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createCategoryRecord,
  listCategories,
} from "@/lib/data/categories";
import {
  createBannerRecord,
  listBanners,
  type BannerPosition,
} from "@/lib/data/banners";
import { ensureDefaultProducts } from "@/lib/data/legacy-products";

export async function initializeDatabase() {
  try {
    logger.info("🔄 Initializing Supabase database...");

    await initializeAuthAdmin();
    await initializeDefaultCategories();
    await initializeDefaultBanners();
    await ensureDefaultProducts();

    logger.info("✅ Supabase database initialized successfully");
  } catch (error) {
    logger.error("❌ Supabase database initialization failed:", error);
    throw error;
  }
}

async function initializeDefaultBanners() {
  const defaultBanners: Array<{
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
  }> = [
    {
      name: "Hero Banner 1",
      position: "home_hero",
      image:
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=2070&auto=format&fit=crop",
      alt: "Streetwear hero model",
      title: "Till End of the Era",
      subtitle: "Premium oversized streetwear and graphic tees",
      ctaText: "Shop Collection",
      linkUrl: "/collections",
      order: 1,
      isActive: true,
    },
    {
      name: "Hero Banner 2",
      position: "home_hero",
      image:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=2070&auto=format&fit=crop",
      alt: "Urban fashion collection",
      title: "Wear Your Story",
      subtitle: "Statement pieces for everyday style",
      ctaText: "Explore Drops",
      linkUrl: "/collections",
      order: 2,
      isActive: true,
    },
    {
      name: "Feature Banner",
      position: "home_feature",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2040&auto=format&fit=crop",
      alt: "Centre Stage Collection",
      title: "Centre Stage Collection",
      subtitle: "Curated drops built for bold fits and everyday wear.",
      ctaText: "Explore Now",
      linkUrl: "/collections/centre-stage",
      order: 1,
      isActive: true,
    },
    {
      name: "Collections Hero Banner",
      position: "collections_hero",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
      alt: "Collections hero banner",
      title: "Curated Collections",
      subtitle:
        "Explore our exclusive collections of t-shirts, hand-picked for every style and occasion.",
      ctaText: "Shop Collection",
      linkUrl: "/collections",
      order: 1,
      isActive: true,
    },
    {
      name: "Anime Hero Banner",
      position: "anime_hero",
      image:
        "https://images.unsplash.com/photo-1611605698335-8b1569810432?q=80&w=2070&auto=format&fit=crop",
      alt: "Anime hero banner",
      title: "Anime Collection",
      subtitle:
        "Express your otaku spirit with our premium anime-inspired designs.",
      ctaText: "Explore Anime",
      linkUrl: "/anime",
      order: 1,
      isActive: true,
    },
    {
      name: "Meme Hero Banner",
      position: "meme_hero",
      image:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2070&auto=format&fit=crop",
      alt: "Meme hero banner",
      title: "Meme Collection",
      subtitle:
        "Spread the laughs with our hilarious meme-inspired designs.",
      ctaText: "Explore Memes",
      linkUrl: "/meme",
      order: 1,
      isActive: true,
    },
  ];

  const existing = await listBanners({});

  for (const bannerData of defaultBanners) {
    const exists = existing.find(
      (banner) =>
        banner.name === bannerData.name && banner.position === bannerData.position
    );

    if (!exists) {
      await createBannerRecord(bannerData);
      logger.info(`✅ Created banner: ${bannerData.name}`);
    }
  }
}

async function initializeDefaultCategories() {
  const defaultCategories = [
    {
      id: "collections",
      name: "Collections",
      slug: "collections",
      description: "Our curated collections",
      isActive: true,
      order: 1,
    },
    {
      id: "anime",
      name: "Anime",
      slug: "anime",
      description: "Anime-inspired designs",
      isActive: true,
      order: 2,
    },
    {
      id: "meme",
      name: "Meme",
      slug: "meme",
      description: "Internet meme designs",
      isActive: true,
      order: 3,
    },
    {
      id: "custom",
      name: "Custom",
      slug: "custom",
      description: "Create your own design",
      isActive: true,
      order: 4,
    },
  ];

  const existing = await listCategories();

  for (const categoryData of defaultCategories) {
    const exists = existing.find((category) => category.slug === categoryData.slug);
    if (!exists) {
      await createCategoryRecord(categoryData);
      logger.info(`✅ Created category: ${categoryData.name}`);
    }
  }
}
