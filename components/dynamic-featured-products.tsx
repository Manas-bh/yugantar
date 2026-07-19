"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getTotalStock, normalizeStock } from "@/lib/stock-normalization";
import { ProductCardActions } from "@/components/product-card-actions";
import { optimizeImageUrl } from "@/lib/image-optimization";
import { type Product as ApiProduct, getProductBadge } from "@/lib/types";

export function DynamicFeaturedProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {}
  );

  const loadProducts = async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/products?isFeatured=true", {
        cache: "force-cache",
        signal,
      });

      if (!response.ok) {
        console.error("Failed to fetch featured products");
        return;
      }

      const data = await response.json();
      const productsPayload = data.data || data;
      const fetchedProducts: ApiProduct[] = Array.isArray(productsPayload.products)
        ? productsPayload.products
        : [];

      setProducts(fetchedProducts);

      const defaultSizes: Record<string, string> = {};
      fetchedProducts.forEach((product) => {
        const normalizedStock = normalizeStock(product.stock, product.sizes);
        const availableSize = product.sizes.find(
          (size) => (normalizedStock[size] || 0) > 0
        );

        defaultSizes[product._id] = availableSize || product.sizes[0] || "M";
      });

      setSelectedSizes(defaultSizes);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }

      console.error("Failed to load products:", error);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);



  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-3xl border border-border bg-card p-3">
            <div className="flex h-full flex-col p-0">
              <div className="mb-2 aspect-[4/5] flex-shrink-0 rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2 p-1">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="mt-auto h-9 w-full rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center section-shell">
        <p className="mb-4 pt-8 text-xs text-muted-foreground">
          No featured products available
        </p>
        <Link href="/admin/catalog">
          <Button variant="outline">Add Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: products.length > 4,
        containScroll: "trimSnaps",
      }}
      className="w-full overflow-hidden"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {products.map((product) => {
          const badge = getProductBadge(product);
          const normalizedStock = normalizeStock(product.stock, product.sizes);
          const totalStock = getTotalStock(product.stock, product.sizes);

          return (
            <CarouselItem
              key={product._id}
              className="basis-[82%] pl-2 sm:basis-1/2 md:pl-4 lg:basis-1/3 xl:basis-1/4"
            >
              <div className="h-full">
                <Card className="group surface-card flex h-full min-h-[24rem] flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="flex h-full flex-col p-0">
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="relative aspect-[4/5] w-full bg-[hsl(var(--surface-1))]">
                        <Image
                          src={optimizeImageUrl(
                            product.images[0] ||
                              "/placeholder.svg?height=400&width=400",
                            { width: 960, quality: 65 }
                          )}
                          alt={product.name}
                          fill
                          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 82vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
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

                      <div className="p-4 pb-0">
                        <h3 className="mb-1 line-clamp-1 text-lg font-bold lowercase text-foreground transition-colors group-hover:text-primary">
                          {product.name}
                        </h3>
                        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>

                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="ml-1 text-sm font-medium">
                              {product.rating}
                            </span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {product.reviews} reviews
                          </span>
                        </div>

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
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col px-4 pb-4">

                      <div className="mb-3">
                        <div className="mb-2 flex items-start gap-2">
                          <span className="flex-shrink-0 text-sm font-medium text-foreground/80">
                            Size:
                          </span>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                            {product.sizes.map((size) => {
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
                                  className={`flex-shrink-0 rounded-md border px-3 py-2 text-sm transition-colors ${
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

                      <div className="mt-auto">
                        <ProductCardActions
                          product={product}
                          selectedSize={selectedSizes[product._id]}
                          normalizedStock={normalizedStock}
                        />

                        {totalStock <= 5 && totalStock > 0 && (
                          <p className="mt-1 text-center text-xs text-orange-600">
                            Only {totalStock} left in stock!
                          </p>
                        )}
                        {totalStock === 0 && (
                          <p className="mt-1 text-center text-xs text-red-600">
                            Out of stock
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-border bg-background/95 hover:bg-muted md:flex" />
      <CarouselNext className="right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-border bg-background/95 hover:bg-muted md:flex" />
    </Carousel>
  );
}
