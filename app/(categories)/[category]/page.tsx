"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoryPageLayout } from "@/components/category-page-layout";
import { type Product } from "@/lib/types";
import { getCategories, type Category } from "@/lib/catalog";

const DYNAMIC_HERO_FALLBACK = {
  src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=62&w=1280&auto=format&fit=crop",
  alt: "Category hero banner",
  title: "Explore Our Collection",
  subtitle:
    "Discover amazing designs across our curated collections.",
  ctaText: "Shop Now",
  linkUrl: "/collections",
};

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  bannerImage?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerCtaText?: string;
  bannerLinkUrl?: string;
}

export default function DynamicCategoryPage() {
  const params = useParams();
  const categorySlug = typeof params.category === "string" ? params.category : "";

  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch category info and validate it exists
  useEffect(() => {
    const validateCategory = async () => {
      try {
        setLoading(true);

        // First check localStorage categories (source of truth for navbar)
        const localCategories = getCategories();
        const localCategory = localCategories.find(
          (cat) => cat.slug === categorySlug || cat.id === categorySlug
        );

        if (localCategory) {
          setCategoryInfo({
            id: localCategory.id,
            name: localCategory.name,
            slug: localCategory.slug,
            description: localCategory.description || `Browse our ${localCategory.name} collection`,
            bannerImage: localCategory.bannerImage,
            bannerTitle: localCategory.bannerTitle,
            bannerSubtitle: localCategory.bannerSubtitle,
            bannerCtaText: localCategory.bannerCtaText,
            bannerLinkUrl: localCategory.bannerLinkUrl,
          });
          setLoading(false);
          return;
        }

        // Fallback: fetch from API (Supabase) to validate
        const response = await fetch("/api/categories");
        
        if (response.ok) {
          const data = await response.json();
          const categories: CategoryInfo[] = Array.isArray(data.categories) 
            ? data.categories 
            : [];
          
          const category = categories.find(
            (cat) => cat.slug === categorySlug || cat.id === categorySlug
          );
          
          if (category) {
            setCategoryInfo({
              ...category,
              description: category.description || `Browse our ${category.name} collection`,
            });
          } else {
            // Category doesn't exist in Supabase either - try products API
            const productsResponse = await fetch(
              `/api/products?category=${encodeURIComponent(categorySlug)}&isActive=true&limit=1`
            );
            
            if (productsResponse.ok) {
              const productsData = await productsResponse.json();
              if (productsData.products && productsData.products.length > 0) {
                setCategoryInfo({
                  id: categorySlug,
                  name: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1).replace(/-/g, " "),
                  slug: categorySlug,
                  description: `Browse our ${categorySlug} collection`,
                });
              } else {
                setCategoryInfo(null);
              }
            } else {
              setCategoryInfo(null);
            }
          }
        } else {
          setCategoryInfo(null);
        }
      } catch (err) {
        console.error("Error validating category:", err);
        setError(err instanceof Error ? err.message : "Failed to validate category");
        setCategoryInfo(null);
      } finally {
        setLoading(false);
      }
    };

    if (categorySlug) {
      validateCategory();
    }
  }, [categorySlug]);

  // Custom category filter builder for dynamic pages
  const buildDynamicCategories = (products: Product[]) => {
    const categoryName = categoryInfo?.name || categorySlug;
    return [
      { id: "all", name: `All ${categoryName}`, count: products.length },
      ...Array.from(
        new Set(
          products.flatMap((product) =>
            product.tags.map((tag) => tag.toLowerCase())
          )
        )
      )
        .slice(0, 10) // Limit to top 10 tags
        .map((tag) => ({
          id: tag,
          name: tag.charAt(0).toUpperCase() + tag.slice(1),
          count: products.filter((p) =>
            p.tags.map((t) => t.toLowerCase()).includes(tag)
          ).length,
        })),
    ];
  };

  // Custom hero fallback based on category
  const heroFallback = categoryInfo
    ? {
        src: categoryInfo.bannerImage || DYNAMIC_HERO_FALLBACK.src,
        alt: `${categoryInfo.name} hero banner`,
        title: categoryInfo.bannerTitle || `${categoryInfo.name} Collection`,
        subtitle:
          categoryInfo.bannerSubtitle ||
          categoryInfo.description ||
          `Explore our amazing ${categoryInfo.name} designs.`,
        ctaText: categoryInfo.bannerCtaText || `Explore ${categoryInfo.name}`,
        linkUrl: categoryInfo.bannerLinkUrl || `/${categorySlug}`,
      }
    : DYNAMIC_HERO_FALLBACK;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading category...</p>
        </div>
      </div>
    );
  }

  if (error || !categoryInfo) {
    notFound();
    return null;
  }

  return (
    <CategoryPageLayout
      apiCategory={categorySlug}
      heroBannerPosition="collections_hero"
      heroFallback={heroFallback}
      buildCategories={buildDynamicCategories}
      loadingMessage={`Loading ${categoryInfo.name} products...`}
    />
  );
}