type CookiePolicyEnv = {
  NODE_ENV?: string;
};

export function shouldUseSecureAuthCookies(env: CookiePolicyEnv = process.env) {
  return env.NODE_ENV === "production";
}

export function authSessionCookieName(env: CookiePolicyEnv = process.env) {
  return shouldUseSecureAuthCookies(env)
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}
