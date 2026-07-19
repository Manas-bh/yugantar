/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  redirects: async () => [
    {
      source: "/anime-tshirts-india",
      destination: "/anime",
      permanent: true,
    },
    {
      source: "/funny-meme-tshirts-india",
      destination: "/meme",
      permanent: true,
    },
    {
      source: "/graphic-tshirts-india",
      destination: "/collections",
      permanent: true,
    },
    {
      source: "/oversized-tshirts-india",
      destination: "/collections",
      permanent: true,
    },
    {
      source: "/streetwear-tshirts-india",
      destination: "/collections",
      permanent: true,
    },
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    deviceSizes: [360, 390, 430, 640, 750, 828, 1080, 1280, 1536],
    imageSizes: [96, 128, 256, 384, 512, 640, 768],
    minimumCacheTTL: 60 * 60 * 24,
  },
}

export default nextConfig
