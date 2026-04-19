"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddToCart } from "@/components/add-to-cart";
import { optimizeImageUrl } from "@/lib/image-optimization";

interface ProductCardActionsProps {
  product: {
    _id: string;
    slug: string;
    name: string;
    price: number;
    images: string[];
    sizes: string[];
    colors: string[];
    category: string[];
  };
  selectedSize?: string;
  normalizedStock: { [size: string]: number };
}

export function ProductCardActions({
  product,
  selectedSize,
  normalizedStock,
}: ProductCardActionsProps) {
  return (
    <div className="mt-auto space-y-2">
      <Link href={`/products/${product.slug}`} className="block">
        <Button variant="outline" size="sm" className="w-full">
          View Details
        </Button>
      </Link>

      <AddToCart
        key={`${product._id}-${selectedSize}`}
        productId={product._id}
        name={product.name}
        price={product.price}
        image={optimizeImageUrl(product.images[0] || "/placeholder.svg", {
          width: 960,
          quality: 65,
        })}
        sizes={product.sizes}
        defaultSize={selectedSize || product.sizes[0]}
        defaultColor="Black"
        colors={product.category.includes("custom") ? product.colors : ["Black"]}
        stock={normalizedStock}
        category={product.category.join(", ")}
        variant="default"
        size="sm"
        className="w-full"
        compact={true}
      />
    </div>
  );
}
