import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Oversized T-Shirts Online India - Premium Streetwear Fits",
  description:
    "Shop oversized t-shirts online in India at Yugantar. Discover premium streetwear fits, bold graphics, and comfortable all-day wear.",
  path: "/oversized-tshirts-india",
  keywords: [
    "oversized t-shirts India",
    "buy oversized tees online",
    "streetwear t-shirts India",
    "baggy fit t-shirt India",
    "premium oversized tshirt",
  ],
});

export default function OversizedTshirtsIndiaPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Oversized T-Shirts Online India",
    description:
      "Premium oversized t-shirts and streetwear-inspired fits for shoppers across India.",
    url: absoluteUrl("/oversized-tshirts-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Oversized T-Shirts", url: "/oversized-tshirts-india" },
      ]).itemListElement,
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="app-shell py-6 sm:py-8">
        <div className="section-shell px-5 py-10 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-extrabold lowercase text-foreground sm:text-4xl">
            Oversized T-Shirts Online in India
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Elevate everyday style with premium oversized t-shirts designed for
            comfort, movement and standout streetwear aesthetics.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collections">
              <Button className="cta-pill-primary px-6">Shop Oversized Collection</Button>
            </Link>
            <Link href="/anime">
              <Button variant="outline" className="cta-pill px-6">Explore Anime Tees</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 pb-12 sm:py-6 sm:pb-14">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Why Oversized Fits Are Popular
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Relaxed silhouette for modern streetwear styling.</li>
          <li>Breathable, premium fabric suited for all-day comfort.</li>
          <li>Pairs easily with cargos, denims, joggers, and layered looks.</li>
          <li>Graphic-heavy styles for anime, meme and culture-inspired fashion.</li>
        </ul>
        </div>
      </section>
    </main>
  );
}
