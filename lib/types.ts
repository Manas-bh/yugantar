/**
 * Shared Product type used across category pages, featured products,
 * and product card components.
 *
 * This is the client-side API response shape (camelCase).
 * For the database record shape (snake_case), see lib/data/types.ts → ProductRecord.
 */
export interface Product {
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

/**
 * Determines the appropriate badge label for a product based on its properties.
 * Returns null if no badge should be shown.
 */
export function getProductBadge(product: Product): string | null {
  if (product.isFeatured) return "Featured";
  if (product.tags.includes("bestseller")) return "Bestseller";
  if (product.tags.includes("new")) return "New";
  if (product.tags.includes("viral")) return "Viral";
  if (product.tags.includes("trending")) return "Trending";
  if (product.tags.includes("popular")) return "Popular";
  return null;
}
