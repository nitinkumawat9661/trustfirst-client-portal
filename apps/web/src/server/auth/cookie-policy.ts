type CookiePolicyEnv = {
  AUTH_URL?: string;
  NEXTAUTH_URL?: string;
  NODE_ENV?: string;
  TRUSTFIRST_ALLOW_LOOPBACK_STAGING?: string;
  TRUSTFIRST_DEMO_MODE?: string;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function shouldUseSecureAuthCookies(env: CookiePolicyEnv = process.env) {
  if (env.NODE_ENV !== "production") {
    return false;
  }

  return !isExplicitLoopbackStagingAuth(env);
}

export function authSessionCookieName(env: CookiePolicyEnv = process.env) {
  return shouldUseSecureAuthCookies(env)
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

function isExplicitLoopbackStagingAuth(env: CookiePolicyEnv) {
  if (
    env.TRUSTFIRST_DEMO_MODE !== "staging" ||
    env.TRUSTFIRST_ALLOW_LOOPBACK_STAGING !== "true"
  ) {
    return false;
  }

  const configuredUrl = env.AUTH_URL ?? env.NEXTAUTH_URL;

  if (!configuredUrl) {
    return false;
  }

  try {
    const url = new URL(configuredUrl);
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
