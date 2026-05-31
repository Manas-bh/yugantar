"use client";

import { CategoryPageLayout } from "@/components/category-page-layout";
import { type Product } from "@/lib/types";

const ANIME_HERO_FALLBACK = {
  src: "https://images.unsplash.com/photo-1611605698335-8b1569810432?q=62&w=1280&auto=format&fit=crop",
  alt: "Anime hero banner",
  title: "Anime Collection",
  subtitle:
    "Express your otaku spirit with our premium anime-inspired designs. From classic series to the latest hits!",
  ctaText: "Explore Anime",
  linkUrl: "/anime",
};

function buildAnimeCategories(products: Product[]) {
  return [
    { id: "all", name: "All Anime", count: products.length },
    {
      id: "naruto",
      name: "Naruto",
      count: products.filter((p) => p.tags.includes("naruto")).length,
    },
    {
      id: "attack-on-titan",
      name: "Attack on Titan",
      count: products.filter(
        (p) => p.tags.includes("attack-on-titan") || p.tags.includes("aot")
      ).length,
    },
    {
      id: "dragon-ball-z",
      name: "Dragon Ball Z",
      count: products.filter(
        (p) => p.tags.includes("dragon-ball-z") || p.tags.includes("dbz")
      ).length,
    },
    {
      id: "one-piece",
      name: "One Piece",
      count: products.filter((p) => p.tags.includes("one-piece")).length,
    },
    {
      id: "demon-slayer",
      name: "Demon Slayer",
      count: products.filter((p) => p.tags.includes("demon-slayer")).length,
    },
    {
      id: "my-hero-academia",
      name: "My Hero Academia",
      count: products.filter((p) => p.tags.includes("my-hero-academia"))
        .length,
    },
  ];
}

export default function AnimePage() {
  return (
    <CategoryPageLayout
      apiCategory="anime"
      heroBannerPosition="anime_hero"
      heroFallback={ANIME_HERO_FALLBACK}
      buildCategories={buildAnimeCategories}
      tagAliases={[
        { categoryId: "attack-on-titan", aliases: ["aot"] },
        { categoryId: "dragon-ball-z", aliases: ["dbz"] },
      ]}
      loadingMessage="Loading anime products..."
    />
  );
}
