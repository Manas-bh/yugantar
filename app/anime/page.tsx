"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Grid,
  List,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { CategoryFilterChips } from "@/components/category-filter-chips";
import { normalizeStock, getTotalStock } from "@/lib/stock-normalization";
import { CategoryHeroBanner } from "@/components/category-hero-banner";
import { ProductCardActions } from "@/components/product-card-actions";
import { SiteHeader } from "@/components/site-header";
import { optimizeImageUrl } from "@/lib/image-optimization";

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string[];
  tags: string[];
  sizes: string[];
  colors: string[];
  stock: number | { [size: string]: number };
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

const ANIME_HERO_FALLBACK = {
  src: "https://images.unsplash.com/photo-1611605698335-8b1569810432?q=62&w=1280&auto=format&fit=crop",
  alt: "Anime hero banner",
  title: "Anime Collection",
  subtitle:
    "Express your otaku spirit with our premium anime-inspired designs. From classic series to the latest hits!",
  ctaText: "Explore Anime",
  linkUrl: "/anime",
};

export default function AnimePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [animeProducts, setAnimeProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnimeProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "/api/products?category=anime&isActive=true",
          {
            cache: "force-cache",
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        const products: Product[] = Array.isArray(data.products)
          ? data.products
          : [];

        setAnimeProducts(products);
        // Initialize default sizes - select first available size
        const defaultSizes: Record<string, string> = {};
        products.forEach((product: Product) => {
          const normalizedStock = normalizeStock(product.stock, product.sizes);
          // Find first size that's in stock
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
        console.error("Error fetching anime products:", err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAnimeProducts();

    return () => {
      controller.abort();
    };
  }, []);

  // Create categories based on tags from products
  const categories = [
    { id: "all", name: "All Anime", count: animeProducts.length },
    {
      id: "naruto",
      name: "Naruto",
      count: animeProducts.filter((p) => p.tags.includes("naruto")).length,
    },
    {
      id: "attack-on-titan",
      name: "Attack on Titan",
      count: animeProducts.filter(
        (p) => p.tags.includes("attack-on-titan") || p.tags.includes("aot")
      ).length,
    },
    {
      id: "dragon-ball-z",
      name: "Dragon Ball Z",
      count: animeProducts.filter(
        (p) => p.tags.includes("dragon-ball-z") || p.tags.includes("dbz")
      ).length,
    },
    {
      id: "one-piece",
      name: "One Piece",
      count: animeProducts.filter((p) => p.tags.includes("one-piece")).length,
    },
    {
      id: "demon-slayer",
      name: "Demon Slayer",
      count: animeProducts.filter((p) => p.tags.includes("demon-slayer"))
        .length,
    },
    {
      id: "my-hero-academia",
      name: "My Hero Academia",
      count: animeProducts.filter((p) => p.tags.includes("my-hero-academia"))
        .length,
    },
  ];

  const filteredProducts =
    selectedCategory === "all"
      ? animeProducts
      : animeProducts.filter((product) =>
          product.tags.some(
            (tag) =>
              tag.includes(selectedCategory) ||
              (selectedCategory === "attack-on-titan" && tag === "aot") ||
              (selectedCategory === "dragon-ball-z" && tag === "dbz")
          )
        );

  const getProductBadge = (product: Product) => {
    if (product.isFeatured) return "Featured";
    if (product.tags.includes("bestseller")) return "Bestseller";
    if (product.tags.includes("new")) return "New";
    if (product.tags.includes("viral")) return "Viral";
    if (product.tags.includes("trending")) return "Trending";
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading anime products...
          </p>
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
      <SiteHeader currentPath="/anime" />

      <CategoryHeroBanner fallback={ANIME_HERO_FALLBACK} position="anime_hero" />

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
                <p className="text-sm text-muted-foreground">{filteredProducts.length} products</p>
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
            {filteredProducts.map((product) => {
              const badge = getProductBadge(product);
              return (
                <Card
                  key={product._id}
                  className={`group surface-card h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    viewMode === "list" ? "flex-row min-h-48" : "min-h-96"
                  }`}
                >
                  <CardContent
                    className={`p-0 h-full ${
                      viewMode === "list" ? "flex" : "flex flex-col"
                    }`}
                  >
                    <div
                      className={`relative ${
                        viewMode === "list"
                          ? "w-48 flex-shrink-0"
                          : "aspect-[4/5] w-full"
                      }`}
                    >
                      <Image
                        src={optimizeImageUrl(
                          product.images[0] || "/placeholder.svg",
                          { width: 960, quality: 65 }
                        )}
                        alt={product.name}
                        fill
                        className={`object-cover transition-transform duration-300 ${
                          viewMode === "list" ? "rounded-l-3xl" : "rounded-t-3xl"
                        }`}
                        sizes={
                          viewMode === "list"
                            ? "192px"
                            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        }
                      />
                      {badge && (
                        <Badge className="absolute left-3 top-3 rounded-full bg-[hsl(var(--surface-3))] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--surface-3-foreground))] hover:bg-[hsl(var(--surface-3))]">
                          {badge}
                        </Badge>
                      )}
                      <div className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-black/65 text-white shadow-md">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      {product.originalPrice && (
                        <Badge className="absolute bottom-3 left-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground hover:bg-accent">
                          Save ₹
                          {(product.originalPrice - product.price).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="mb-1 line-clamp-1 text-lg font-bold lowercase text-foreground transition-colors group-hover:text-primary">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="mb-3 line-clamp-2 flex-grow text-sm text-muted-foreground">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium ml-1">
                            {product.rating}
                          </span>
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {product.reviews} reviews
                        </span>
                      </div>

                      {/* Price Section */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-extrabold text-foreground">
                            ₹{product.price}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Size Options */}
                      <div className="mb-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="flex-shrink-0 text-sm font-medium text-foreground/80">
                            Size:
                          </span>
                          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                            {product.sizes.map((size) => {
                              const normalizedStock = normalizeStock(
                                product.stock,
                                product.sizes
                              );
                              const isOutOfStock =
                                (normalizedStock[size] || 0) === 0;
                              return (
                                <button
                                  key={size}
                                  onClick={() => {
                                    if (!isOutOfStock) {
                                      setSelectedSizes((prev) => ({
                                        ...prev,
                                        [product._id]: size,
                                      }));
                                    }
                                  }}
                                  disabled={isOutOfStock}
                                  className={`px-3 py-2 text-sm rounded-md border flex-shrink-0 transition-colors ${
                                    isOutOfStock
                                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
                                      : selectedSizes[product._id] === size
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-foreground hover:bg-muted"
                                   }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Add to Cart Section */}
                      <div className="mt-auto">
                        <ProductCardActions
                          product={product}
                          selectedSize={selectedSizes[product._id]}
                          normalizedStock={normalizeStock(product.stock, product.sizes)}
                        />

                        {/* Stock Information */}
                        {getTotalStock(product.stock, product.sizes) <= 5 &&
                          getTotalStock(product.stock, product.sizes) > 0 && (
                            <p className="text-orange-600 text-xs mt-1 text-center">
                              Only {getTotalStock(product.stock, product.sizes)}{" "}
                              left in stock!
                            </p>
                          )}
                        {getTotalStock(product.stock, product.sizes) === 0 && (
                          <p className="text-red-600 text-xs mt-1 text-center">
                            Out of stock
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
