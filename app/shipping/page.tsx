import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Shipping Information - T-Shirt Delivery India",
  description:
    "Learn about shipping timelines, delivery coverage, and order dispatch for Yugantar t-shirts across India.",
  path: "/shipping",
  keywords: [
    "t-shirt shipping India",
    "delivery time t-shirts",
    "yugantar shipping policy",
    "anime t-shirt delivery",
    "custom t-shirt shipping",
  ],
});

export default function ShippingPage() {
  const shippingStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Shipping Information",
    description:
      "Shipping and delivery information for Yugantar t-shirt orders in India.",
    url: absoluteUrl("/shipping"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Shipping", url: "/shipping" },
      ]).itemListElement,
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(shippingStructuredData),
        }}
      />

      <section className="app-shell py-6 sm:py-8">
        <div className="section-shell px-5 py-10 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-extrabold lowercase text-foreground sm:text-4xl">
            Shipping Information
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            We ship Yugantar t-shirts across India with reliable courier partners.
            Timelines vary by city tier and product type.
          </p>
        </div>
      </section>

      <section className="app-shell py-2 pb-10 sm:pb-12">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="surface-card p-5">
            <h2 className="text-xl font-semibold lowercase text-foreground">Dispatch Time</h2>
            <p className="mt-2 text-foreground/80">
              Most ready designs are dispatched within 24-48 hours. Custom
              printed t-shirts may require extra production time.
            </p>
          </article>

          <article className="surface-card p-5">
            <h2 className="text-xl font-semibold lowercase text-foreground">Delivery ETA</h2>
            <p className="mt-2 text-foreground/80">
              Metro cities: 3-7 business days. Non-metro regions: 5-10 business
              days after dispatch.
            </p>
          </article>

          <article className="surface-card p-5">
            <h2 className="text-xl font-semibold lowercase text-foreground">Tracking</h2>
            <p className="mt-2 text-foreground/80">
              Tracking details are shared after shipment pickup. You can use the
              tracking link from your order communication.
            </p>
          </article>

          <article className="surface-card p-5">
            <h2 className="text-xl font-semibold lowercase text-foreground">Support</h2>
            <p className="mt-2 text-foreground/80">
              If your parcel is delayed, contact support@yugantar.studio with your
              order details for quick help.
            </p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/collections">
            <Button>Continue Shopping</Button>
          </Link>
          <Link href="/faq">
            <Button variant="outline">Read FAQs</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
