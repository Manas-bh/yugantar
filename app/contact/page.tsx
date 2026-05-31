import { Metadata } from "next";
import {
  absoluteUrl,
  createMetadata,
  generateBreadcrumbStructuredData,
} from "@/lib/seo";
import { ContactPageClient } from "./contact-page-client";

const SUPPORT_EMAIL = "support@yugantar.studio";

export const metadata: Metadata = createMetadata({
  title: "Contact Yugantar - T-Shirt Support India",
  description:
    "Contact Yugantar for order support, shipping help, returns and product inquiries across India.",
  path: "/contact",
  keywords: [
    "contact Yugantar",
    "customer support",
    "t-shirt support India",
    "t-shirt inquiries",
    "Yugantar phone number",
    "Yugantar email",
    "customer service",
  ],
});

export default function ContactPage() {
  const contactStructuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Yugantar",
    description:
      "Get in touch with Yugantar for customer support and inquiries about premium t-shirts.",
    url: absoluteUrl("/contact"),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: generateBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Contact", url: "/contact" },
      ]).itemListElement,
    },
    mainEntity: {
      "@type": "Organization",
      name: "Yugantar",
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+91-8810259676",
          contactType: "Customer Service",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
          hoursAvailable: "Mo-Su 09:00-21:00",
        },
        {
          "@type": "ContactPoint",
          email: SUPPORT_EMAIL,
          contactType: "Customer Support",
          areaServed: "IN",
        },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "H 34 Sector 12",
        addressLocality: "Noida",
        addressRegion: "Uttar Pradesh",
        postalCode: "201301",
        addressCountry: "IN",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactStructuredData),
        }}
      />
      <div className="min-h-screen bg-background">

        <div className="app-shell pt-6">
          <div className="section-shell px-5 py-6 sm:px-6">
            <h1 className="text-3xl font-extrabold lowercase text-foreground">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              We'd love to hear from you. Get in touch with our team.
            </p>
          </div>
        </div>
        <ContactPageClient supportEmail={SUPPORT_EMAIL} />
      </div>
    </>
  );
}
