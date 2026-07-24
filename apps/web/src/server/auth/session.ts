import { auth } from "@/auth";
import { AppError } from "../domain/errors";

export async function requireCurrentUser() {
  const session = await auth();

  if (session?.user?.id) {
    return session.user;
  }

  throw new AppError({
    code: "UNAUTHORIZED",
    message: "Authentication is required.",
    status: 401,
  });
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
