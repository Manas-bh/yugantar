type OptimizeImageOptions = {
  width?: number;
  quality?: number;
};

export function optimizeImageUrl(
  src: string,
  { width = 1200, quality = 70 }: OptimizeImageOptions = {}
): string {
  if (!src || src.startsWith("data:")) {
    return src;
  }

  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    if (src.includes("f_auto") || src.includes("q_auto")) {
      return src;
    }

    return src.replace(
      "/upload/",
      `/upload/f_auto,q_auto,dpr_auto,c_limit,w_${width}/`
    );
  }

  if (src.includes("images.unsplash.com/")) {
    try {
      const url = new URL(src);
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(quality));
      return url.toString();
    } catch {
      return src;
    }
  }

  return src;
}
