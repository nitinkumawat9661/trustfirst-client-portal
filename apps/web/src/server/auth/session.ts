import { auth } from "@/auth";
import { AppError } from "../domain/errors";
import { getHttpStagingBypassUser, isHttpStagingAuthBypassActive } from "./staging-auth-bypass";

export async function requireCurrentUser() {
  const session = await auth();

  if (session?.user?.id) {
    return session.user;
  }

  if (await isHttpStagingAuthBypassActive()) {
    const bypassUser = await getHttpStagingBypassUser();
    if (bypassUser?.id) return bypassUser;
  }

  if (!session?.user?.id) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
      status: 401,
    });
  }

  return session.user;
}

export function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const entries = cookie.split(";").map((entry) => entry.trim());
  const sessionCookie = entries.find(
    (entry) =>
      entry.startsWith("authjs.session-token=") ||
      entry.startsWith("__Secure-authjs.session-token="),
  );

  return sessionCookie?.split("=").slice(1).join("=");
}
