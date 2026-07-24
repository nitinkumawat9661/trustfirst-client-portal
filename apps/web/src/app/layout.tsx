import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mangalamsanitary.in"),
  title: {
    default: "Mangalam Sanitary ERP",
    template: "%s | Mangalam Sanitary ERP",
  },
  description: "Secure business operations workspace for Mangalam Sanitary.",
  applicationName: "Mangalam Sanitary ERP",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mangalam ERP",
  },
  icons: {
    icon: "/icons/pwa-icon.svg",
    apple: "/icons/pwa-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Mangalam Sanitary ERP",
    description: "Secure business operations workspace for Mangalam Sanitary.",
    siteName: "Mangalam Sanitary ERP",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

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
