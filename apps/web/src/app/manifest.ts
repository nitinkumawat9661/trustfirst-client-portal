import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    categories: ["business", "productivity"],
    description: "Mangalam Sanitary business operations and hardware ERP workspace.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/api/public/branding/mangalam-sanitary-logo",
        type: "image/jpeg",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/api/public/branding/mangalam-sanitary-logo",
        type: "image/jpeg",
      },
    ],
    id: "/",
    lang: "en",
    name: "Mangalam Sanitary ERP",
    orientation: "portrait-primary",
    scope: "/",
    short_name: "Mangalam ERP",
    start_url: "/admin",
    theme_color: "#171717",
  };
}
