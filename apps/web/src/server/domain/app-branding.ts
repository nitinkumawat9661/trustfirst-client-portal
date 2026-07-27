import type { Metadata, MetadataRoute } from "next";
import {
  CANONICAL_ORIGINS,
  type AppSurface,
} from "./host-routing";

const mangalamLogo = "/api/public/branding/mangalam-sanitary-logo";
const trustFirstIcon = "/icons/pwa-icon.svg";
const trustFirstMaskableIcon = "/icons/pwa-maskable.svg";

export function metadataForSurface(surface: AppSurface): Metadata {
  if (surface === "MANGALAM_PUBLIC") {
    return {
      applicationName: "Mangalam Sanitary",
      description:
        "Mangalam Sanitary, Sikar - bathware, plumbing, sanitary ware and hardware solutions.",
      icons: {
        apple: mangalamLogo,
        icon: mangalamLogo,
      },
      manifest: "/manifest.webmanifest",
      metadataBase: new URL(CANONICAL_ORIGINS.mangalamPublic),
      openGraph: {
        description:
          "Bathware, plumbing, sanitary ware and hardware solutions in Sikar.",
        siteName: "Mangalam Sanitary",
        title: "Mangalam Sanitary",
        type: "website",
      },
      robots: {
        follow: true,
        index: true,
      },
      title: {
        default: "Mangalam Sanitary | Bathware, Plumbing & Hardware",
        template: "%s | Mangalam Sanitary",
      },
      twitter: {
        card: "summary",
        description:
          "Bathware, plumbing, sanitary ware and hardware solutions in Sikar.",
        title: "Mangalam Sanitary",
      },
    };
  }

  if (surface === "MANGALAM_ERP") {
    return {
      applicationName: "MANGALAM SANITARY ERP",
      description: "Secure business operations workspace for Mangalam Sanitary.",
      icons: {
        apple: mangalamLogo,
        icon: mangalamLogo,
      },
      manifest: "/manifest.webmanifest",
      metadataBase: new URL(CANONICAL_ORIGINS.mangalamErp),
      openGraph: {
        description: "Secure Mangalam Sanitary ERP for products, stock, purchasing, billing and ledgers.",
        siteName: "MANGALAM SANITARY ERP",
        title: "MANGALAM SANITARY ERP",
        type: "website",
      },
      robots: {
        follow: false,
        index: false,
      },
      title: {
        default: "MANGALAM SANITARY ERP",
        template: "%s | MANGALAM SANITARY ERP",
      },
      twitter: {
        card: "summary",
        description: "Secure Mangalam Sanitary ERP for products, stock, purchasing, billing and ledgers.",
        title: "MANGALAM SANITARY ERP",
      },
    };
  }

  if (surface === "TRUSTFIRST_PORTAL") {
    return {
      applicationName: "TrustFirst Client Portal",
      description: "Secure TrustFirst client and project workspace.",
      icons: {
        apple: trustFirstIcon,
        icon: trustFirstIcon,
      },
      manifest: "/manifest.webmanifest",
      metadataBase: new URL(CANONICAL_ORIGINS.trustFirstPortal),
      robots: {
        follow: false,
        index: false,
      },
      title: {
        default: "TrustFirst Client Portal",
        template: "%s | TrustFirst Client Portal",
      },
    };
  }

  return {
    description: "Secure business workspace.",
    robots: {
      follow: false,
      index: false,
    },
    title: "Secure Business Workspace",
  };
}

export function manifestForSurface(surface: AppSurface): MetadataRoute.Manifest {
  if (surface === "TRUSTFIRST_PORTAL") {
    return {
      background_color: "#ffffff",
      categories: ["business", "productivity"],
      description: "Secure TrustFirst client and project workspace.",
      display: "standalone",
      icons: [
        {
          purpose: "any",
          sizes: "192x192",
          src: trustFirstIcon,
          type: "image/svg+xml",
        },
        {
          purpose: "maskable",
          sizes: "512x512",
          src: trustFirstMaskableIcon,
          type: "image/svg+xml",
        },
      ],
      id: `${CANONICAL_ORIGINS.trustFirstPortal}/client`,
      lang: "en",
      name: "TrustFirst Client Portal",
      orientation: "portrait-primary",
      scope: `${CANONICAL_ORIGINS.trustFirstPortal}/`,
      short_name: "TrustFirst",
      start_url: `${CANONICAL_ORIGINS.trustFirstPortal}/client`,
      theme_color: "#2563eb",
    };
  }

  return {
    background_color: "#0f0f0f",
    categories: ["business", "productivity"],
    description: "Mangalam Sanitary ERP for products, stock, purchasing, billing and ledgers.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: mangalamLogo,
        type: "image/jpeg",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: mangalamLogo,
        type: "image/jpeg",
      },
    ],
    id: `${CANONICAL_ORIGINS.mangalamErp}/mangalam-erp`,
    lang: "en",
    name: "MANGALAM SANITARY ERP",
    orientation: "portrait-primary",
    scope: `${CANONICAL_ORIGINS.mangalamErp}/`,
    short_name: "Mangalam ERP",
    start_url: `${CANONICAL_ORIGINS.mangalamErp}/admin`,
    theme_color: "#171717",
  };
}

export function serviceWorkerCachePrefix(surface: AppSurface) {
  if (surface === "TRUSTFIRST_PORTAL") return "trustfirst-client-portal";
  if (surface === "MANGALAM_PUBLIC" || surface === "MANGALAM_ERP") return "mangalam-sanitary-erp";
  return "business-workspace";
}
