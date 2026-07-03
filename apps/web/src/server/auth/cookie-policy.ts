const HTTP_STAGING_AUTH_URL = "http://45.10.21.141:3010";
const HTTP_STAGING_HOST = "45.10.21.141:3010";

type CookiePolicyEnv = {
  AUTH_URL?: string;
  NODE_ENV?: string;
  TRUSTFIRST_HTTP_STAGING_LOGIN?: string;
};

export function isTemporaryHttpStagingLoginEnabled(env: CookiePolicyEnv = process.env) {
  if (env.NODE_ENV !== "production") return false;
  if (env.TRUSTFIRST_HTTP_STAGING_LOGIN !== "yes") return false;
  if (!env.AUTH_URL) return false;

  try {
    const authUrl = new URL(env.AUTH_URL);
    return (
      authUrl.protocol === "http:" &&
      authUrl.host === HTTP_STAGING_HOST &&
      authUrl.origin === HTTP_STAGING_AUTH_URL &&
      ["/", ""].includes(authUrl.pathname)
    );
  } catch {
    return false;
  }
}

export function shouldUseSecureAuthCookies(env: CookiePolicyEnv = process.env) {
  return env.NODE_ENV === "production" && !isTemporaryHttpStagingLoginEnabled(env);
}

export function authSessionCookieName(env: CookiePolicyEnv = process.env) {
  return shouldUseSecureAuthCookies(env)
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}
