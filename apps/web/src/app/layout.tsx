import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://trustfirst.example.com"),
  title: {
    default: "TrustFirst Client Portal",
    template: "%s | TrustFirst Client Portal",
  },
  description: "Secure client collaboration portal for trust-first service teams.",
  applicationName: "TrustFirst Client Portal",
  openGraph: {
    title: "TrustFirst Client Portal",
    description: "Secure client collaboration portal for trust-first service teams.",
    siteName: "TrustFirst Client Portal",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
