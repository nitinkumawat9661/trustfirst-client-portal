import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { manifestForSurface } from "@/server/domain/app-branding";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const requestHeaders = await headers();
  const surface = resolveAppSurfaceFromHost(readEffectiveHost(requestHeaders));

  return manifestForSurface(surface);
}
