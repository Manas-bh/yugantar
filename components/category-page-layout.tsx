"use client";

import { Button } from "@/components/ui/button";
import { Grid, List, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { CategoryFilterChips } from "@/components/category-filter-chips";
import { normalizeStock } from "@/lib/stock-normalization";
import { CategoryHeroBanner, type CategoryHeroPosition } from "@/components/category-hero-banner";
import { ProductCard } from "@/components/product-card";
import { type Product } from "@/lib/types";

interface CategoryDef {
  id: string;
  name: string;
  count: number;
}

interface HeroFallback {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
}

interface TagAlias {
  /** The category filter id */
  categoryId: string;
  /** Alternative tag values that should also match */
  aliases: string[];
}

interface CategoryPageLayoutProps {
  /** API query parameter for category (e.g. "anime", "meme", "collections") */
  apiCategory: string;
  /** Banner position key for CategoryHeroBanner */
  heroBannerPosition: CategoryHeroPosition;
  /** Fallback hero banner data */
  heroFallback: HeroFallback;
  /** Whether to prioritize loading the hero image */
  heroPriority?: boolean;
  /**
   * Provide explicit category filter definitions.
   * If omitted, categories are auto-generated from product tags.
   */
  categories?: CategoryDef[];
  /**
   * When using explicit categories, build them as functions of products
   * so counts update dynamically. Provide a builder instead.
   */
  buildCategories?: (products: Product[]) => CategoryDef[];
  /**
   * Optional tag aliases for filtering.
   * E.g. { categoryId: "attack-on-titan", aliases: ["aot"] }
   */
  tagAliases?: TagAlias[];
  /** Loading message shown during fetch */
  loadingMessage?: string;
}

export function CategoryPageLayout({
  apiCategory,
  heroBannerPosition,
  heroFallback,
  heroPriority = false,
  buildCategories,
  tagAliases = [],
  loadingMessage = "Loading products...",
}: CategoryPageLayoutProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products?category=${apiCategory}&isActive=true`,
          {
            cache: "force-cache",
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        const productsPayload = data.data || data;
        const fetchedProducts: Product[] = Array.isArray(productsPayload.products)
          ? productsPayload.products
          : [];

        setProducts(fetchedProducts);

        // Initialize default sizes – select first available size
        const defaultSizes: Record<string, string> = {};
        fetchedProducts.forEach((product: Product) => {
          const normalizedStock = normalizeStock(product.stock, product.sizes);
          const availableSize = product.sizes.find(
            (size) => (normalizedStock[size] || 0) > 0
          );
          defaultSizes[product._id] = availableSize || product.sizes[0] || "M";
        });
        setSelectedSizes(defaultSizes);
        setError(null);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error(`Error fetching ${apiCategory} products:`, err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      controller.abort();
    };
  }, [apiCategory]);

  // Build category filter chips
  const categories: CategoryDef[] = buildCategories
    ? buildCategories(products)
    : [
        { id: "all", name: "All", count: products.length },
        ...Array.from(
          new Set(
            products.flatMap((product) =>
              product.tags.map((tag) => tag.toLowerCase())
            )
          )
        ).map((tag) => ({
          id: tag,
          name: tag.charAt(0).toUpperCase() + tag.slice(1),
          count: products.filter((p) =>
            p.tags.map((t) => t.toLowerCase()).includes(tag)
          ).length,
        })),
      ];

  // Build alias lookup
  const aliasMap = new Map<string, string[]>();
  tagAliases.forEach(({ categoryId, aliases }) => {
    aliasMap.set(categoryId, aliases);
  });

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) =>
          product.tags.some((tag) => {
            if (tag.includes(selectedCategory)) return true;
            // Check aliases
            const aliases = aliasMap.get(selectedCategory);
            if (aliases) {
              return aliases.some((alias) => tag === alias);
            }
            return false;
          })
        );

  const handleSizeChange = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: size,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CategoryHeroBanner
        fallback={heroFallback}
        position={heroBannerPosition}
        priority={heroPriority}
      />

      <div className="app-shell py-6 sm:py-8">
        <div className="section-shell mb-6 p-4 sm:mb-8 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <CategoryFilterChips
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-9 w-9 p-0"
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-9 p-0"
                  aria-label="List view"
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} products
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No products found for the selected category.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-3 sm:gap-4"
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                viewMode={viewMode}
                selectedSize={selectedSizes[product._id]}
                onSizeChange={handleSizeChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
