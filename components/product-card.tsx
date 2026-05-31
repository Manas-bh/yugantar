"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { normalizeStock, getTotalStock } from "@/lib/stock-normalization";
import { ProductCardActions } from "@/components/product-card-actions";
import { optimizeImageUrl } from "@/lib/image-optimization";
import { type Product, getProductBadge } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  selectedSize?: string;
  onSizeChange: (productId: string, size: string) => void;
}

export function ProductCard({
  product,
  viewMode,
  selectedSize,
  onSizeChange,
}: ProductCardProps) {
  const badge = getProductBadge(product);
  const normalizedStock = normalizeStock(product.stock, product.sizes);
  const totalStock = getTotalStock(product.stock, product.sizes);

  return (
    <Card
      className={`group surface-card h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
        viewMode === "list" ? "flex-row min-h-48" : "min-h-96"
      }`}
    >
      <CardContent
        className={`p-0 h-full ${
          viewMode === "list" ? "flex" : "flex flex-col"
        }`}
      >
        <Link
          href={`/products/${product.slug}`}
          className={viewMode === "list" ? "flex" : "block"}
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
          <div className="p-4 pb-0">
            <h3 className="mb-1 line-clamp-1 text-lg font-bold lowercase text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
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
          </div>
        </Link>
        <div className="px-4 pb-4 flex-1 flex flex-col">
          {/* Size Options */}
          <div className="mb-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="flex-shrink-0 text-sm font-medium text-foreground/80">
                Size:
              </span>
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                {product.sizes.map((size) => {
                  const isOutOfStock =
                    (normalizedStock[size] || 0) === 0;
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (!isOutOfStock) {
                          onSizeChange(product._id, size);
                        }
                      }}
                      disabled={isOutOfStock}
                      className={`px-3 py-2 text-sm rounded-md border flex-shrink-0 transition-colors ${
                        isOutOfStock
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
                          : selectedSize === size
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
              selectedSize={selectedSize}
              normalizedStock={normalizedStock}
            />

            {/* Stock Information */}
            {totalStock <= 5 && totalStock > 0 && (
              <p className="text-orange-600 text-xs mt-1 text-center">
                Only {totalStock} left in stock!
              </p>
            )}
            {totalStock === 0 && (
              <p className="text-red-600 text-xs mt-1 text-center">
                Out of stock
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
