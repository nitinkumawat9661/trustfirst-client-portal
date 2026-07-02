import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    categories: ["business", "productivity"],
    description: "TrustFirst Client Portal with offline-ready hardware ERP workflows.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/pwa-icon.svg",
        type: "image/svg+xml",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/pwa-maskable.svg",
        type: "image/svg+xml",
      },
    ],
    id: "/",
    lang: "en",
    name: "TrustFirst Client Portal",
    orientation: "portrait-primary",
    scope: "/",
    short_name: "TrustFirst",
    start_url: "/admin/hardware/inventory",
    theme_color: "#0f172a",
  };
}
