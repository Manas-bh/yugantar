import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Streetwear T-Shirts India - Premium Urban Fits",
  description:
    "Shop streetwear t-shirts in India with bold graphics, oversized cuts, and premium quality fabric. Build modern urban fits with Yugantar.",
  path: "/streetwear-tshirts-india",
  keywords: [
    "streetwear t-shirts India",
    "urban t-shirt style India",
    "oversized streetwear tees",
    "premium street fashion India",
    "streetwear graphic tee",
  ],
});

export default function StreetwearTshirtsIndiaPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Streetwear T-Shirts India",
    description:
      "Modern streetwear t-shirts and oversized looks for urban styling in India.",
    url: absoluteUrl("/streetwear-tshirts-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Streetwear T-Shirts", url: "/streetwear-tshirts-india" },
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
            Streetwear T-Shirts in India
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Build confident streetwear looks with premium t-shirts designed for
            layered fits, bold prints, and everyday versatility.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/oversized-tshirts-india">
              <Button className="cta-pill-primary px-6">Explore Oversized Tees</Button>
            </Link>
            <Link href="/collections">
              <Button variant="outline" className="cta-pill px-6">Browse All Collections</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 pb-12 sm:py-6 sm:pb-14">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Streetwear Styling Essentials
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Start with relaxed tees and clean sneakers as your base.</li>
          <li>Use statement prints sparingly to keep outfits balanced.</li>
          <li>Layer with shirts, jackets, or hoodies for depth.</li>
          <li>Prioritize fit and fabric over logo-heavy styling.</li>
        </ul>
        </div>
      </section>
    </main>
  );
}
