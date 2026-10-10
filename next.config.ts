import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Las fotos se suben por una acción del servidor. El navegador las reduce
    // a 2560 px antes de enviarlas, así que rara vez pasan de 2 MB. En Vercel
    // el tope real de una petición es 4.5 MB.
    serverActions: { bodySizeLimit: "12mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
