import type { AppSurface } from "./host-routing";

export type SignInBrand = "MANGALAM" | "TRUSTFIRST";

export function defaultSignInDestination(surface: AppSurface) {
  return surface === "TRUSTFIRST_PORTAL" ? "/client" : "/admin";
}

export function signInBrandForSurface(surface: AppSurface): SignInBrand {
  return surface === "MANGALAM_ERP" || surface === "MANGALAM_PUBLIC"
    ? "MANGALAM"
    : "TRUSTFIRST";
}

export function safeSignInCallback(value: string | undefined, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
