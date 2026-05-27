"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCategories,
  getNavbarConfig,
  type Category,
  type NavbarConfig,
} from "@/lib/catalog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronRight, Menu } from "lucide-react";

interface DynamicNavbarProps {
  currentPath?: string;
}

export function DynamicNavbar({ currentPath = "" }: DynamicNavbarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [navbarConfig, setNavbarConfig] = useState<NavbarConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadNavbarData = () => {
      try {
        const categoriesData = getCategories();
        const configData = getNavbarConfig();

        setCategories(categoriesData);
        setNavbarConfig(configData);
      } catch (error) {
        console.error("Failed to load navbar data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNavbarData();

    // Listen for storage changes to update navbar in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "stylesage_categories" ||
        e.key === "stylesage_navbar" ||
        e.key === "yugantar_categories" ||
        e.key === "yugantar_navbar"
      ) {
        loadNavbarData();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  if (!mounted || isLoading) {
    return (
      <>
        <nav className="hidden lg:flex space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-muted"
            />
          ))}
        </nav>
        <div className="lg:hidden">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        </div>
      </>
    );
  }

  if (!navbarConfig) return null;

  // Get active categories in order
  // Always include 'collections' category, even if not active or missing
  let activeCategories = categories
    .filter(
      (cat) =>
        navbarConfig.categories.includes(cat.id) &&
        cat.id !== "custom" &&
        cat.slug !== "custom"
    )
    .sort((a, b) => a.order - b.order);

  // If 'collections' is missing, add it from defaults (check both id and slug to prevent duplicates)
  if (
    !activeCategories.find((cat) => cat.id === "collections" || cat.slug === "collections")
  ) {
    activeCategories = [
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
      ...activeCategories,
    ];
  }

  const activeLinks = navbarConfig.customLinks.filter(
    (link) => link.isActive && !/^\/custom(\/|$)/.test(link.href)
  );

  const navLinks = [
    ...activeCategories.map((cat) => ({
      href: `/${cat.slug}`,
      label: cat.name,
    })),
    ...activeLinks.map((link) => ({ href: link.href, label: link.name })),
  ];

  return (
    <>
      <nav className="hidden lg:flex items-center gap-2">
        {activeCategories.map((category) => (
          <Link
            key={category.id}
            href={`/${category.slug}`}
            className={`pill-control ${
              currentPath === `/${category.slug}`
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {category.name}
          </Link>
        ))}

        {activeLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`pill-control ${
              currentPath === link.href
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-border bg-background"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88%] border-r border-border bg-background p-0 sm:max-w-sm">
            <div className="flex h-full flex-col">
              <div className="border-b border-border/80 px-5 py-6">
                <Link href="/" className="inline-flex items-center">
                  <span className="text-lg font-black uppercase tracking-[0.2em] text-foreground">Yugantar</span>
                </Link>
                <p className="mt-2 text-sm text-muted-foreground">Navigate collections and quick links</p>
              </div>
              <nav className="flex flex-1 flex-col gap-2 px-4 py-4">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-base font-medium transition-colors ${
                        currentPath === link.href
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="border-t border-border/80 px-5 py-4">
                <Link href="/collections" className="cta-pill-accent inline-flex w-full justify-center">
                  Shop Collection
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
