"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { optimizeImageUrl } from "@/lib/image-optimization";

type CategoryHeroPosition = "collections_hero" | "anime_hero" | "meme_hero";

interface CategoryHeroBannerProps {
  position: CategoryHeroPosition;
  fallback: {
    src: string;
    alt: string;
    title: string;
    subtitle: string;
    ctaText?: string;
    linkUrl?: string;
  };
  className?: string;
  priority?: boolean;
}

interface BannerResponseItem {
  _id?: string;
  image?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
}

interface LoadedHeroBanner {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
}

export function CategoryHeroBanner({
  position,
  fallback,
  className,
  priority = false,
}: CategoryHeroBannerProps) {
  const [banner, setBanner] = useState<LoadedHeroBanner>({
    src: fallback.src,
    alt: fallback.alt,
    title: fallback.title,
    subtitle: fallback.subtitle,
    ctaText: fallback.ctaText || "Explore Now",
    linkUrl: fallback.linkUrl || "/collections",
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadBanner = async () => {
      try {
        const response = await fetch(`/api/banners?position=${position}&limit=1`, {
          cache: "force-cache",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const items: BannerResponseItem[] = Array.isArray(data.banners)
          ? data.banners
          : [];

        const firstBanner = items.find(
          (entry): entry is BannerResponseItem & { image: string } =>
            typeof entry?.image === "string" && entry.image.length > 0
        );

        if (!isMounted || !firstBanner) {
          return;
        }

        setBanner({
          src: firstBanner.image,
          alt: firstBanner.alt || fallback.alt,
          title: firstBanner.title || fallback.title,
          subtitle: firstBanner.subtitle || fallback.subtitle,
          ctaText: firstBanner.ctaText || fallback.ctaText || "Explore Now",
          linkUrl: firstBanner.linkUrl || fallback.linkUrl || "/collections",
        });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }

        console.error(`Failed to load ${position} banner:`, error);
      }
    };

    loadBanner();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [position, fallback.src, fallback.alt, fallback.title, fallback.subtitle, fallback.ctaText, fallback.linkUrl]);

  return (
    <section className={cn("app-shell py-6 sm:py-8", className)}>
      <div className="section-shell relative overflow-hidden">
        <div className="grid min-h-[340px] grid-cols-1 md:min-h-[420px] md:grid-cols-12">
          <div className="relative order-2 min-h-[220px] md:order-1 md:col-span-7 md:min-h-[420px]">
            <Image
              src={optimizeImageUrl(banner.src, { width: 1400, quality: 62 })}
              alt={banner.alt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 55vw, 58vw"
              priority={priority}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
          </div>

          <div className="order-1 flex flex-col justify-center px-5 py-6 md:order-2 md:col-span-5 md:px-8">
            <p className="section-kicker">curated collection</p>
            <h1 className="mt-2 text-[clamp(1.8rem,5vw,3.2rem)] font-extrabold lowercase leading-[1.02] text-foreground">
              {banner.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {banner.subtitle}
            </p>
            <Link href={banner.linkUrl} className="mt-6 inline-flex">
              <Button className="cta-pill-accent px-6">{banner.ctaText}</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
