import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
}> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/collections", changefreq: "daily", priority: "0.9" },
  { path: "/anime", changefreq: "daily", priority: "0.9" },
  { path: "/meme", changefreq: "daily", priority: "0.9" },
  { path: "/custom", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/shipping", changefreq: "monthly", priority: "0.5" },
  { path: "/tshirt-brands-india", changefreq: "weekly", priority: "0.7" },
  { path: "/custom-tshirt-printing-india", changefreq: "weekly", priority: "0.7" },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.4" },
];

function buildStaticSitemapXml() {
  const now = new Date().toISOString();

  const urls = STATIC_ROUTES.map(
    ({ path, changefreq, priority }) =>
      `<url><loc>${absoluteUrl(path)}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export async function GET() {
  return new NextResponse(buildStaticSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
