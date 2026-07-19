import { NextResponse } from "next/server";
import { absoluteUrl, domainMigrationConfig } from "@/lib/seo";

export const revalidate = 3600;

export function GET() {
  const body = [
    "# Yugantar",
    "",
    "Yugantar is an Indian premium t-shirt store focused on anime tees, meme t-shirts, oversized streetwear, and custom printed apparel.",
    "",
    "## Core Pages",
    `- Home: ${absoluteUrl("/")}`,
    `- Collections: ${absoluteUrl("/collections")}`,
    `- Anime Collection: ${absoluteUrl("/anime")}`,
    `- Meme Collection: ${absoluteUrl("/meme")}`,
    `- Custom Design: ${absoluteUrl("/custom")}`,
    `- Custom Printing SEO: ${absoluteUrl("/custom-tshirt-printing-india")}`,
    `- FAQ: ${absoluteUrl("/faq")}`,
    `- Shipping: ${absoluteUrl("/shipping")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Brand Alternatives: ${absoluteUrl("/tshirt-brands-india")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
    "## Shopping Intent",
    "- Buy premium t-shirts online in India",
    "- Anime graphic t-shirts and otaku apparel",
    "- Meme and internet culture t-shirts",
    "- Custom printed t-shirts with uploaded designs",
    "",
    "## Support",
    "- Email: support@yugantar.studio",
    "",
    "## Domain",
    `- Current canonical domain: ${domainMigrationConfig.newDomain}`,
    `- Previous domain: ${domainMigrationConfig.oldDomain}`,
    "",
    "## Crawling Notes",
    "- Public catalog and content pages are crawlable.",
    "- Private/user pages (cart, checkout, account, admin, API) are restricted.",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
