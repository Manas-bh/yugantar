"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { optimizeImageUrl } from "@/lib/image-optimization";

interface HeroSlide {
  id: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
}

interface ApiBanner {
  _id?: string;
  image?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl?: string;
  order?: number;
}

const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    src: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=65&w=1280&auto=format&fit=crop",
    alt: "Streetwear hero model",
    title: "Till End of the Era",
    subtitle: "Premium oversized streetwear and graphic tees",
    ctaText: "Shop Collection",
    linkUrl: "/collections",
  },
  {
    id: "fallback-2",
    src: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=62&w=1280&auto=format&fit=crop",
    alt: "Urban fashion collection",
    title: "Wear Your Story",
    subtitle: "Statement pieces for everyday style",
    ctaText: "Explore Drops",
    linkUrl: "/collections",
  },
  {
    id: "fallback-3",
    src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=62&w=1280&auto=format&fit=crop",
    alt: "Premium oversized tee",
    title: "Built For Expression",
    subtitle: "Designs that stand out from the crowd",
    ctaText: "View Products",
    linkUrl: "/collections",
  },
];

export function HomeHeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(FALLBACK_HERO_SLIDES);

  const activeSlide = heroSlides[currentSlide] || heroSlides[0];

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadHeroBanners = async () => {
      try {
        const response = await fetch("/api/banners?position=home_hero", {
          cache: "force-cache",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const banners: ApiBanner[] = Array.isArray(data.banners)
          ? data.banners
          : [];

        const remoteSlides = banners
          .filter(
            (banner): banner is ApiBanner & { image: string } =>
              typeof banner?.image === "string" && banner.image.length > 0
          )
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((banner, index) => ({
            id: banner._id || `remote-${index}`,
            src: banner.image,
            alt: banner.alt || "Homepage banner",
            title: banner.title || "Till End of the Era",
            subtitle: banner.subtitle || "Premium oversized streetwear and graphic tees",
            ctaText: banner.ctaText || "Shop Collection",
            linkUrl: banner.linkUrl || "/collections",
          }));

        if (isMounted && remoteSlides.length > 0) {
          setHeroSlides(remoteSlides);
          setCurrentSlide(0);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }

        console.error("Failed to load hero banners:", error);
      }
    };

    loadHeroBanners();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (currentSlide >= heroSlides.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, heroSlides.length]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateCurrentSlide = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    updateCurrentSlide();
    api.on("select", updateCurrentSlide);
    api.on("reInit", updateCurrentSlide);

    return () => {
      api.off("select", updateCurrentSlide);
      api.off("reInit", updateCurrentSlide);
    };
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const autoPlay = setInterval(() => {
      if (document.visibilityState === "visible") {
        api.scrollNext();
      }
    }, 5000);

    return () => clearInterval(autoPlay);
  }, [api]);

  return (
    <section className="app-shell pt-4 sm:pt-6">
      <Carousel
        key={heroSlides.length}
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          containScroll: "trimSnaps",
        }}
        className="section-shell relative overflow-hidden"
      >
        <CarouselContent className="-ml-0 h-full">
          {heroSlides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-0">
              <div className="grid min-h-[520px] w-full grid-cols-1 bg-card lg:min-h-[560px] lg:grid-cols-12">
                <div className="relative order-1 min-h-[280px] overflow-hidden lg:order-2 lg:col-span-7 lg:min-h-[560px]">
                    <Image
                    src={optimizeImageUrl(slide.src, { width: 1400, quality: 62 })}
                    alt={slide.alt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 55vw, 58vw"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/5 to-transparent lg:bg-gradient-to-l lg:from-black/15 lg:via-transparent lg:to-transparent" />
                </div>

                <div className="order-2 flex flex-col justify-between px-4 pb-6 pt-5 sm:px-6 lg:order-1 lg:col-span-5 lg:px-8 lg:py-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    New Season Drop
                  </div>

                  <div className="mt-4 lg:mt-8">
                    <h1 className="text-[clamp(2rem,8vw,3.8rem)] font-extrabold lowercase leading-[0.95] text-foreground">
                      {activeSlide?.title || "Till End of the Era"}
                    </h1>
                    {activeSlide?.subtitle ? (
                      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {activeSlide.subtitle}
                      </p>
                    ) : null}
                    <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                      <Link href={activeSlide?.linkUrl || "/collections"}>
                        <Button className="cta-pill-primary px-6 sm:px-7">
                          {activeSlide?.ctaText || "Shop Collection"}
                        </Button>
                      </Link>
                      <Link href="/collections" className="cta-pill border border-border bg-background px-6 text-foreground hover:bg-muted">
                        Open Store
                      </Link>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-2 lg:mt-10">
                    {[
                      "Oversized",
                      "Graphic",
                      "Anime",
                      "Streetwear",
                    ].map((tag) => (
                      <span key={tag} className="pill-control py-1.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-3 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 rounded-full border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex md:h-11 md:w-11" />
        <CarouselNext className="right-3 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 rounded-full border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex md:h-11 md:w-11" />
      </Carousel>

      <div className="mt-4 flex justify-center gap-2 sm:mt-5">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300",
              currentSlide === index
                ? "w-10 bg-foreground"
                : "w-2.5 bg-foreground/25 hover:bg-foreground/40"
            )}
          />
        ))}
      </div>
    </section>
  );
}
