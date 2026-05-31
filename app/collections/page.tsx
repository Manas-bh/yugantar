"use client";

import { CategoryPageLayout } from "@/components/category-page-layout";

const COLLECTIONS_HERO_FALLBACK = {
  src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=62&w=1280&auto=format&fit=crop",
  alt: "Collections hero banner",
  title: "Curated Collections",
  subtitle:
    "Explore our exclusive collections of t-shirts, hand-picked for every style and occasion.",
  ctaText: "Explore Collection",
  linkUrl: "/collections",
};

export default function CollectionsPage() {
  return (
    <CategoryPageLayout
      apiCategory="collections"
      heroBannerPosition="collections_hero"
      heroFallback={COLLECTIONS_HERO_FALLBACK}
      heroPriority
      loadingMessage="Loading collections..."
    />
  );
}
