import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFeaturedProducts } from "@/components/dynamic-featured-products";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Buy Premium T-Shirts Online - Anime, Meme, Custom",
  description:
    "Shop premium t-shirts online in India at Yugantar. Explore anime t-shirts, meme t-shirts, oversized streetwear, and custom printed tees with fast shipping.",
  path: "/",
  keywords: [
    "buy t-shirts online India",
    "anime t-shirts online",
    "meme t-shirts India",
    "custom t-shirt printing India",
    "oversized t-shirts",
    "streetwear India",
    "t-shirt alternatives to myntra ajio snitch bewakoof wrogn",
  ],
});

export default function Home() {
  const homePageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Buy Premium T-Shirts Online in India",
    description:
      "Shop premium anime, meme, oversized and custom t-shirts with fast shipping across India.",
    url: absoluteUrl("/"),
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      name: "Yugantar",
      url: absoluteUrl(),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
      ]).itemListElement,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homePageStructuredData),
        }}
      />

      <main className="flex-1">
        <HomeHeroCarousel />

        <section className="app-shell py-10 sm:py-12 md:py-14">
          <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
            <div>
              <p className="section-kicker">curated now</p>
              <h2 className="section-title mt-1">recent arrivals</h2>
            </div>
            <Link href="/collections" className="cta-pill-accent px-4 sm:px-5">
              Open Store
            </Link>
          </div>
          <DynamicFeaturedProducts />
        </section>

        <HomeFeatureBanner />
      </main>
    </div>
  );
}
