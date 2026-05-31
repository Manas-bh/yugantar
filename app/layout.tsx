import type React from "react";
import type { Metadata, Viewport } from "next";
import { Montserrat, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CombinedProviders } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  createMetadata,
  generateLocalBusinessStructuredData,
  generateOrganizationStructuredData,
  generateWebsiteStructuredData,
} from "@/lib/seo";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});

export const metadata: Metadata = createMetadata({
  title: "Buy Premium T-Shirts Online in India",
  description:
    "Shop premium t-shirts online in India. Anime tees, meme t-shirts, oversized streetwear and custom printed t-shirts with fast shipping.",
  keywords: [
    "Yugantar",
    "buy t-shirts online",
    "best t-shirt website India",
    "streetwear India",
    "premium t-shirts",
    "oversized tees",
    "anime t-shirts",
    "meme t-shirts",
    "custom t-shirts India",
  ],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationStructuredData();
  const websiteSchema = generateWebsiteStructuredData();
  const localBusinessSchema = generateLocalBusinessStructuredData();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* Favicons */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* SEO meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="IN-UP" />
        <meta name="geo.placename" content="Noida" />
        <meta name="geo.position" content="28.6139;77.2090" />
        <meta name="ICBM" content="28.6139, 77.2090" />
        <meta name="googlebot-news" content="index,follow" />
        <meta
          name="google-site-verification"
          content="j1uSQaEaa1yilnjFXycuHu4pShKd0kl9XCKSrP1sPA4"
        />
        <meta
          name="classification"
          content="E-commerce, Fashion, T-Shirts, Streetwear"
        />
        <meta name="target" content="India" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Structured data for organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
      </head>
      <body className={`${montserrat.variable} ${sora.variable} font-body`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <CombinedProviders>
            <SiteHeader />
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <SiteFooter />
            <Toaster />
          </CombinedProviders>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
