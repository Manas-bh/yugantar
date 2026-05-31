import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Funny Meme T-Shirts India - Viral Graphic Tees",
  description:
    "Buy funny meme t-shirts online in India. Shop viral internet-inspired graphic tees with premium print quality and comfortable everyday fits.",
  path: "/funny-meme-tshirts-india",
  keywords: [
    "funny meme t-shirts India",
    "viral meme tees",
    "humor graphic t-shirts",
    "internet meme clothing India",
    "funny printed t-shirts online",
  ],
});

export default function FunnyMemeTshirtsIndiaPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Funny Meme T-Shirts India",
    description:
      "Discover premium funny meme t-shirts and viral internet-inspired graphic designs.",
    url: absoluteUrl("/funny-meme-tshirts-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Funny Meme T-Shirts", url: "/funny-meme-tshirts-india" },
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
            Funny Meme T-Shirts Online in India
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Add humor to your wardrobe with meme-inspired printed t-shirts. Shop
            viral and classic internet references with premium-quality prints.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/meme">
              <Button className="cta-pill-primary px-6">Shop Meme Collection</Button>
            </Link>
            <Link href="/graphic-tshirts-india">
              <Button variant="outline" className="cta-pill px-6">Graphic Tee Guide</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 pb-12 sm:py-6 sm:pb-14">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Popular Meme Tee Use Cases
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Everyday casual fits with a conversation-starting graphic.</li>
          <li>Gifting for friends who follow internet and meme culture.</li>
          <li>Creator-style content shoots and campus events.</li>
          <li>Streetwear outfits with playful, expressive personality.</li>
        </ul>
        </div>
      </section>
    </main>
  );
}
