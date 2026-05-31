import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Best T-Shirt Brands in India - Yugantar Alternative",
  description:
    "Looking for alternatives to popular t-shirt brands in India? Compare styles and shop premium anime, meme, streetwear and custom t-shirts at Yugantar.",
  path: "/tshirt-brands-india",
  keywords: [
    "best t-shirt brands in India",
    "myntra alternative t-shirts",
    "ajio alternative t-shirts",
    "snitch alternative t-shirts",
    "bewakoof alternative",
    "wrogn alternative",
    "bearhouse alternative",
    "soulstore alternative",
    "premium t-shirt brand India",
  ],
});

const brandNames = [
  "Myntra",
  "AJIO",
  "Snitch",
  "Bewakoof",
  "Verado",
  "Wrogn",
  "Bear House",
  "Soulstore",
];

export default function TshirtBrandsIndiaPage() {
  const comparisonStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Best T-Shirt Brands in India",
    description:
      "Discover premium t-shirt options in India and compare style focus, quality, and personalization capabilities.",
    url: absoluteUrl("/tshirt-brands-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Best T-Shirt Brands in India", url: "/tshirt-brands-india" },
      ]).itemListElement,
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Popular T-Shirt Shopping Destinations in India",
      itemListElement: brandNames.map((brand, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: brand,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(comparisonStructuredData),
        }}
      />

      <section className="app-shell py-6 sm:py-8">
        <div className="section-shell px-5 py-10 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-extrabold lowercase text-foreground sm:text-4xl">
            Best T-Shirt Brands in India: Find the Right Fit for Your Style
          </h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
            If you are exploring options beyond large marketplaces and mainstream
            labels, Yugantar is built for shoppers who want premium quality,
            expressive designs, and niche categories like anime, meme and custom
            print t-shirts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collections">
              <Button className="cta-pill-primary px-6">Shop Collections</Button>
            </Link>
            <Link href="/shipping">
              <Button variant="outline" className="cta-pill px-6">Shipping Details</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 sm:py-6">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Popular Names People Compare
        </h2>
        <p className="mt-3 text-muted-foreground">
          Shoppers often compare platforms and brands such as Myntra, AJIO,
          Snitch, Bewakoof, Verado, Wrogn, Bear House and Soulstore when looking
          for t-shirts online in India.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {brandNames.map((brand) => (
            <div
              key={brand}
              className="rounded-2xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/80"
            >
              {brand}
            </div>
          ))}
        </div>
        </div>
      </section>

      <section className="app-shell py-4 sm:py-6">
        <div className="grid gap-5 md:grid-cols-2">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          What to Look for Before You Buy
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="surface-card p-4">
            <h3 className="font-semibold lowercase text-foreground">Fabric Quality</h3>
            <p className="mt-2 text-sm text-foreground/80">
              Prioritize breathable cotton blends, soft hand-feel, and durable
              stitching for long-term comfort.
            </p>
          </article>
          <article className="surface-card p-4">
            <h3 className="font-semibold lowercase text-foreground">Print Durability</h3>
            <p className="mt-2 text-sm text-foreground/80">
              Check if prints are wash-safe and colorfast so graphics stay sharp
              after repeated use.
            </p>
          </article>
          <article className="surface-card p-4">
            <h3 className="font-semibold lowercase text-foreground">Fit and Size Range</h3>
            <p className="mt-2 text-sm text-foreground/80">
              Ensure clear size guidance and broad fit options for better
              conversion and fewer returns.
            </p>
          </article>
        </div>
        </div>

        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Why Choose Yugantar
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Premium t-shirt quality with comfort-focused fits and durable prints.</li>
          <li>Specialized anime and meme collections for expressive streetwear style.</li>
          <li>Custom t-shirt creation for personalized gifting and unique fashion.</li>
          <li>India-focused shipping and support for smooth order experience.</li>
        </ul>

        <div className="mt-8 rounded-2xl border border-border bg-muted/60 p-5">
          <p className="text-sm text-muted-foreground">
            Brand names listed above are referenced only to help shoppers discover
            alternatives. Yugantar is an independent brand and is not affiliated
            with those companies.
          </p>
        </div>
        </div>
        </div>
      </section>
    </main>
  );
}
