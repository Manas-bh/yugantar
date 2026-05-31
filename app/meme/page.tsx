"use client";

import { CategoryPageLayout } from "@/components/category-page-layout";
import { type Product } from "@/lib/types";

const MEME_HERO_FALLBACK = {
  src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=62&w=1280&auto=format&fit=crop",
  alt: "Meme hero banner",
  title: "Meme Collection",
  subtitle:
    "Spread the laughs with our hilarious meme-inspired designs. From viral sensations to timeless classics!",
  ctaText: "Explore Memes",
  linkUrl: "/meme",
};

function buildMemeCategories(products: Product[]) {
  return [
    { id: "all", name: "All Memes", count: products.length },
    {
      id: "classic-meme",
      name: "Classic",
      count: products.filter(
        (p) => p.tags.includes("classic-meme") || p.tags.includes("classic")
      ).length,
    },
    {
      id: "viral",
      name: "Viral",
      count: products.filter((p) => p.tags.includes("viral")).length,
    },
    {
      id: "drake",
      name: "Drake",
      count: products.filter((p) => p.tags.includes("drake")).length,
    },
    {
      id: "stonks",
      name: "Stonks",
      count: products.filter((p) => p.tags.includes("stonks")).length,
    },
    {
      id: "pikachu",
      name: "Pikachu",
      count: products.filter((p) => p.tags.includes("pikachu")).length,
    },
  ];
}

export default function MemePage() {
  return (
    <CategoryPageLayout
      apiCategory="meme"
      heroBannerPosition="meme_hero"
      heroFallback={MEME_HERO_FALLBACK}
      buildCategories={buildMemeCategories}
      tagAliases={[
        { categoryId: "classic-meme", aliases: ["classic"] },
      ]}
      loadingMessage="Loading meme products..."
    />
  );
}
