import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa/pwa-registration";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";
import { metadataForSurface } from "@/server/domain/app-branding";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = readEffectiveHost(requestHeaders);
  const surface = resolveAppSurfaceFromHost(host);

  return metadataForSurface(surface);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
