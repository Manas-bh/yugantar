"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { optimizeImageUrl } from "@/lib/image-optimization";

interface FeatureBanner {
  id: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
}

interface ApiFeatureBanner {
  _id?: string;
  image?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
}

const FALLBACK_BANNER: FeatureBanner = {
  id: "fallback-feature",
  src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=60&w=1200&auto=format&fit=crop",
  alt: "Centre Stage Collection",
  title: "Centre Stage Collection",
  subtitle: "Curated drops built for bold fits and everyday wear.",
  ctaText: "Explore Now",
  linkUrl: "/collections/centre-stage",
};

export function HomeFeatureBanner() {
  const [banner, setBanner] = useState<FeatureBanner>(FALLBACK_BANNER);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadFeatureBanner = async () => {
      try {
        const response = await fetch("/api/banners?position=home_feature&limit=1", {
          cache: "force-cache",
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const banners: ApiFeatureBanner[] = Array.isArray(data.banners)
          ? data.banners
          : [];
        const remoteBanner = banners.find(
          (entry): entry is ApiFeatureBanner & { image: string } =>
            typeof entry?.image === "string" && entry.image.length > 0
        );

        if (!isMounted || !remoteBanner) {
          return;
        }

        setBanner({
          id: remoteBanner._id || "remote-feature",
          src: remoteBanner.image,
          alt: remoteBanner.alt || "Feature banner",
          title: remoteBanner.title || "Centre Stage Collection",
          subtitle:
            remoteBanner.subtitle ||
            "Curated drops built for bold fits and everyday wear.",
          ctaText: remoteBanner.ctaText || "Explore Now",
          linkUrl: remoteBanner.linkUrl || "/collections",
        });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }

        console.error("Failed to load feature banner:", error);
      }
    };

    loadFeatureBanner();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return (
    <section className="app-shell mt-8 sm:mt-10">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-primary px-5 py-8 sm:px-7 md:px-10 md:py-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="section-kicker text-primary-foreground/75">limited offer</p>
            <h2 className="mt-3 max-w-xl text-[clamp(1.9rem,6vw,3.25rem)] font-extrabold lowercase leading-[1.03] text-primary-foreground">
              {banner.title}
            </h2>
            {banner.subtitle ? (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
                {banner.subtitle}
              </p>
            ) : null}
            <div className="mt-6">
              <Link href={banner.linkUrl} className="cta-pill inline-flex border border-white/20 bg-white text-foreground hover:bg-white/90">
                {banner.ctaText}
              </Link>
            </div>
          </div>

          <div className="relative md:col-span-5">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white/10">
              <Image
                src={optimizeImageUrl(banner.src, { width: 960, quality: 60 })}
                alt={banner.alt}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 92vw, (max-width: 768px) 78vw, 33vw"
              />
            </div>
            <div className="absolute -left-1 -top-1 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-xl font-bold text-white backdrop-blur">
              60% OFF
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
