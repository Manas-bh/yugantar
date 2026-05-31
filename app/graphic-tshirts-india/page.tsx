import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Graphic T-Shirts Online India - Bold Printed Tees",
  description:
    "Shop graphic t-shirts online in India at Yugantar. Explore anime, meme, and artistic printed tees with premium fabric and clean fits.",
  path: "/graphic-tshirts-india",
  keywords: [
    "graphic t-shirts India",
    "printed t-shirts online",
    "buy graphic tees India",
    "premium printed tees",
    "street graphic t-shirts",
  ],
});

export default function GraphicTshirtsIndiaPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Graphic T-Shirts Online India",
    description:
      "Explore premium printed and graphic t-shirts for everyday style in India.",
    url: absoluteUrl("/graphic-tshirts-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Graphic T-Shirts", url: "/graphic-tshirts-india" },
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
            Graphic T-Shirts Online in India
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Discover expressive graphic t-shirts built for modern streetwear and
            everyday styling. From anime references to meme-driven visuals,
            Yugantar offers premium printed tees with comfort-first quality.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collections">
              <Button className="cta-pill-primary px-6">Shop Graphic Tees</Button>
            </Link>
            <Link href="/oversized-tshirts-india">
              <Button variant="outline" className="cta-pill px-6">Oversized Fits</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 pb-12 sm:py-6 sm:pb-14">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Graphic Tee Buying Checklist
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Choose breathable, skin-friendly fabrics for long wear.</li>
          <li>Look for colorfast prints that hold up after washes.</li>
          <li>Pick fit type (regular or oversized) based on styling goal.</li>
          <li>Match visual themes with your wardrobe basics.</li>
        </ul>
        </div>
      </section>
    </main>
  );
}
