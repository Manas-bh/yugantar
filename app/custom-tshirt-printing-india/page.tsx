import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Custom T-Shirt Printing Online India",
  description:
    "Create and order custom t-shirt prints online in India. Upload your design, personalize your tee, and get premium quality printing with fast delivery.",
  path: "/custom-tshirt-printing-india",
  keywords: [
    "custom t-shirt printing India",
    "personalized t-shirt India",
    "print t-shirts online",
    "design your own t-shirt",
    "custom graphic tee India",
  ],
});

export default function CustomTshirtPrintingIndiaPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom T-Shirt Printing India",
    description:
      "Upload artwork and create personalized premium t-shirt prints with fast shipping in India.",
    url: absoluteUrl("/custom-tshirt-printing-india"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        {
          name: "Custom T-Shirt Printing",
          url: "/custom-tshirt-printing-india",
        },
      ]).itemListElement,
    },
    provider: {
      "@type": "Organization",
      name: "Yugantar",
      url: absoluteUrl(),
    },
    areaServed: {
      "@type": "Country",
      name: "India",
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
            Custom T-Shirt Printing Online in India
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Turn your idea into wearable style. Upload your design, position the
            artwork, and order premium custom printed t-shirts with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shipping">
              <Button variant="outline" className="cta-pill px-6">Shipping Details</Button>
            </Link>
            <Link href="/collections">
              <Button className="cta-pill-primary px-6">Shop Collections</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-shell py-4 pb-12 sm:py-6 sm:pb-14">
        <div className="section-shell px-5 py-7 sm:px-6">
        <h2 className="text-2xl font-semibold lowercase text-foreground">
          Best For Creators, Teams, and Gifting
        </h2>
        <ul className="mt-4 space-y-3 text-foreground/80">
          <li>Personalized t-shirts for birthdays, events, and communities.</li>
          <li>Upload-ready workflow for your own artwork and text.</li>
          <li>Premium base tees for better comfort and print finish.</li>
          <li>India-wide delivery and support from order to dispatch.</li>
        </ul>
        </div>
      </section>
    </main>
  );
}
