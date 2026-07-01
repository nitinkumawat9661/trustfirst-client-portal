import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@trustfirst/database";
import { AuthenticationService } from "@/server/auth/auth-service";
import { credentialsLoginSchema } from "@/server/auth/schemas";
import type { Permission } from "@/server/authorization/authorization";
import { readRequestMetadata } from "@/server/security/request-metadata";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    maxAge: 30 * 24 * 60 * 60,
    strategy: "jwt",
    updateAge: 12 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsLoginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const authService = new AuthenticationService(getPrisma());
        const result = await authService.authorizeCredentials(
          parsed.data,
          readRequestMetadata(request),
        );

        if (!result.ok) {
          return null;
        }

        return {
          activeTenantId: result.user.activeTenantId,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          id: result.user.id,
          name: result.user.name,
          permissions: result.user.permissions,
          rememberMe: result.rememberMe,
          role: result.user.role,
          status: result.user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.activeTenantId = user.activeTenantId;
        token.permissions = user.permissions;
        token.rememberMe = user.rememberMe;
        token.role = user.role;
        token.sessionVersion = 0;
      }

      if (token.sub) {
        const dbUser = await getPrisma().user.findUnique({
          select: {
            sessionVersion: true,
            status: true,
          },
          where: { id: token.sub },
        });

        if (
          !dbUser ||
          ["DISABLED", "SUSPENDED", "LOCKED"].includes(dbUser.status) ||
          token.sessionVersion !== dbUser.sessionVersion
        ) {
          token.revoked = true;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && !token.revoked) {
        session.user.id = token.sub;
        session.user.activeTenantId =
          typeof token.activeTenantId === "string" ? token.activeTenantId : undefined;
        session.user.permissions = Array.isArray(token.permissions)
          ? (token.permissions as Permission[])
          : [];
        if (token.role === "ADMIN" || token.role === "CLIENT") {
          session.user.role = token.role;
        }
      }

      return session;
    },
  },
});
