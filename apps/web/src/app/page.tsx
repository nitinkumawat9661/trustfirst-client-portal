import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MangalamPublicHome } from "@/components/public/mangalam-public-home";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const host = readEffectiveHost(requestHeaders);
  const surface = resolveAppSurfaceFromHost(host);

  if (surface === "MANGALAM_PUBLIC") {
    return <MangalamPublicHome />;
  }

  const session = await auth();

  if (surface === "MANGALAM_ERP") {
    redirect(session?.user?.id ? "/admin" : "/sign-in");
  }

  if (surface === "TRUSTFIRST_PORTAL") {
    redirect(session?.user?.id ? "/client" : "/sign-in");
  }

  // Preserve localhost/direct-IP migration behavior.
  redirect(session?.user?.id ? "/admin" : "/sign-in");
}
