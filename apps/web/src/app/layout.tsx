import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import {
  CANONICAL_ORIGINS,
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = readEffectiveHost(requestHeaders);
  const surface = resolveAppSurfaceFromHost(host);

  if (surface === "MANGALAM_PUBLIC") {
    return {
      metadataBase: new URL(CANONICAL_ORIGINS.mangalamPublic),
      title: {
        default: "Mangalam Sanitary | Bathware, Plumbing & Hardware",
        template: "%s | Mangalam Sanitary",
      },
      description:
        "Mangalam Sanitary, Sikar — bathware, plumbing, sanitary ware and hardware solutions.",
      applicationName: "Mangalam Sanitary",
      icons: {
        icon: "/api/public/branding/mangalam-sanitary-logo",
      },
      openGraph: {
        title: "Mangalam Sanitary",
        description:
          "Bathware, plumbing, sanitary ware and hardware solutions in Sikar.",
        siteName: "Mangalam Sanitary",
        type: "website",
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  if (surface === "MANGALAM_ERP") {
    return {
      metadataBase: new URL(CANONICAL_ORIGINS.mangalamErp),
      title: {
        default: "Mangalam Sanitary ERP",
        template: "%s | Mangalam Sanitary ERP",
      },
      description: "Secure business operations workspace for Mangalam Sanitary.",
      applicationName: "Mangalam Sanitary ERP",
      manifest: "/manifest.webmanifest",
      icons: {
        icon: "/icons/pwa-icon.svg",
        apple: "/icons/pwa-icon.svg",
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (surface === "TRUSTFIRST_PORTAL") {
    return {
      metadataBase: new URL(CANONICAL_ORIGINS.trustFirstPortal),
      title: {
        default: "TrustFirst Client Portal",
        template: "%s | TrustFirst Client Portal",
      },
      description: "Secure TrustFirst client and project workspace.",
      applicationName: "TrustFirst Client Portal",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: "TrustFirst Client Portal",
    description: "Secure business workspace.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
