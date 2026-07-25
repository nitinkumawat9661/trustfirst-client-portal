import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MangalamReceiptLookup } from "@/components/public/mangalam-receipt-lookup";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check Bill / Receipt",
  description: "Verify a Mangalam Sanitary payment receipt.",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function ReceiptPage() {
  const requestHeaders = await headers();
  const host = readEffectiveHost(requestHeaders);

  if (resolveAppSurfaceFromHost(host) !== "MANGALAM_PUBLIC") {
    notFound();
  }

  return <MangalamReceiptLookup />;
}