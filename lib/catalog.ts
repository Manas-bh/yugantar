export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  order: number;
  bannerImage?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerCtaText?: string;
  bannerLinkUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
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
  stock: { [size: string]: number };
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NavbarConfig {
  id: string;
  categories: string[];
  customLinks: Array<{
    name: string;
    href: string;
    isActive: boolean;
  }>;
  updatedAt: Date;
}

const DEFAULT_NAVBAR_CATEGORIES = ["collections", "anime", "meme"];

function isCustomCategory(category: string): boolean {
  return category === "custom";
}

function isCustomHref(href: string): boolean {
  return /^\/custom(\/|$)/.test(href);
}

function normalizeNavbarConfig(config: NavbarConfig): NavbarConfig {
  const categories = Array.isArray(config.categories)
    ? config.categories.filter(
        (category, index, allCategories) =>
          !isCustomCategory(category) && allCategories.indexOf(category) === index
      )
    : [];

  const customLinks = Array.isArray(config.customLinks)
    ? config.customLinks.filter((link) => !isCustomHref(link?.href || ""))
    : [];

  return {
    ...config,
    categories:
      categories.length > 0 ? categories : [...DEFAULT_NAVBAR_CATEGORIES],
    customLinks,
  };
}

function dispatchStorageUpdate(key: string, value: unknown): void {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        newValue: JSON.stringify(value),
      })
    );
  } catch {
    // Ignore environments where StorageEvent construction is restricted.
  }
}

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "collections",
    name: "Collections",
    slug: "collections",
    description: "Our curated collections",
    isActive: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "anime",
    name: "Anime",
    slug: "anime",
    description: "Anime-inspired designs",
    isActive: true,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "meme",
    name: "Meme",
    slug: "meme",
    description: "Internet meme designs",
    isActive: true,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "custom",
    name: "Custom",
    slug: "custom",
    description: "Create your own design",
    isActive: true,
    order: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Storage functions (replace with real database in production)
export function getCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;

  const stored =
    localStorage.getItem("stylesage_categories") ||
    localStorage.getItem("yugantar_categories");

  if (stored && !localStorage.getItem("stylesage_categories")) {
    localStorage.setItem("stylesage_categories", stored);
  }

  return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("stylesage_categories", JSON.stringify(categories));
  dispatchStorageUpdate("stylesage_categories", categories);
}

export function getProducts(): Product[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("stylesage_products");
  return stored ? JSON.parse(stored) : [];
}

export function saveProducts(products: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("stylesage_products", JSON.stringify(products));
  dispatchStorageUpdate("stylesage_products", products);
}

export function getNavbarConfig(): NavbarConfig {
  const defaultConfig: NavbarConfig = {
    id: "default",
    categories: [...DEFAULT_NAVBAR_CATEGORIES],
    customLinks: [{ name: "About", href: "/about", isActive: true }],
    updatedAt: new Date(),
  };

  if (typeof window === "undefined") {
    return defaultConfig;
  }

  const stored =
    localStorage.getItem("stylesage_navbar") ||
    localStorage.getItem("yugantar_navbar");

  if (stored && !localStorage.getItem("stylesage_navbar")) {
    localStorage.setItem("stylesage_navbar", stored);
  }

  if (!stored) {
    return defaultConfig;
  }

  const parsedConfig = JSON.parse(stored) as NavbarConfig;
  const normalizedConfig = normalizeNavbarConfig(parsedConfig);

  if (JSON.stringify(parsedConfig) !== JSON.stringify(normalizedConfig)) {
    localStorage.setItem("stylesage_navbar", JSON.stringify(normalizedConfig));
  }

  return normalizedConfig;
}

export function saveNavbarConfig(config: NavbarConfig): void {
  if (typeof window === "undefined") return;

  const normalizedConfig = normalizeNavbarConfig(config);
  localStorage.setItem("stylesage_navbar", JSON.stringify(normalizedConfig));
  dispatchStorageUpdate("stylesage_navbar", normalizedConfig);
}

// CRUD operations
export function createCategory(
  categoryData: Omit<Category, "id" | "createdAt" | "updatedAt">
): Category {
  const categories = getCategories();
  const newCategory: Category = {
    ...categoryData,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  categories.push(newCategory);
  saveCategories(categories);
  return newCategory;
}

export function updateCategory(
  id: string,
  updates: Partial<Category>
): Category | null {
  const categories = getCategories();
  const index = categories.findIndex((cat) => cat.id === id);
  if (index === -1) return null;

  categories[index] = {
    ...categories[index],
    ...updates,
    updatedAt: new Date(),
  };
  saveCategories(categories);
  return categories[index];
}

export function deleteCategory(id: string): boolean {
  const categories = getCategories();
  const filteredCategories = categories.filter((cat) => cat.id !== id);
  if (filteredCategories.length === categories.length) return false;

  saveCategories(filteredCategories);
  return true;
}

export function createProduct(
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">
): Product {
  const products = getProducts();
  const newProduct: Product = {
    ...productData,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(
  id: string,
  updates: Partial<Product>
): Product | null {
  const products = getProducts();
  const index = products.findIndex((prod) => prod.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date(),
  };
  saveProducts(products);
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const products = getProducts();
  const filteredProducts = products.filter((prod) => prod.id !== id);
  if (filteredProducts.length === products.length) return false;

  saveProducts(filteredProducts);
  return true;
}

export function updateStock(
  productId: string,
  newStock: { [size: string]: number }
): boolean {
  return updateProduct(productId, { stock: newStock }) !== null;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export interface Banner {
  id: string;
  imageDesk: string;
  imageMob: string;
  linkUrl: string;
  position: "hero" | "category" | "footer";
  isActive: boolean;
  order: number;
}

export function getBanners(): Banner[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("yugantar_banners");
  if (stored) return JSON.parse(stored);
  return [
    {
      id: "hero-1",
      imageDesk: "/assets/hero-desk.png",
      imageMob: "/assets/hero-mob.png",
      linkUrl: "/collections",
      position: "hero",
      isActive: true,
      order: 1
    }
  ];
}

export function saveBanners(banners: Banner[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("yugantar_banners", JSON.stringify(banners));
    window.dispatchEvent(new StorageEvent("storage", { key: "yugantar_banners" }));
  }
}
