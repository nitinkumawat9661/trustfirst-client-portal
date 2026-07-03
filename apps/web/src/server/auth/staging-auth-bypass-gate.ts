const HTTP_STAGING_AUTH_URL = "http://45.10.21.141:3010";
export const HTTP_STAGING_HOST = "45.10.21.141:3010";

export type StagingAuthBypassEnv = {
  AUTH_URL?: string;
  DEPLOY_ALLOW_SHARED_OLD_VPS?: string;
  NODE_ENV?: string;
  TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS?: string;
  TRUSTFIRST_HTTP_STAGING_LOGIN?: string;
};

export function isHttpStagingAuthBypassEnabled(input: {
  env?: StagingAuthBypassEnv;
  host?: string | null;
  internalQaHeader?: string | null;
}) {
  const env = input.env ?? process.env;
  if (env.NODE_ENV !== "production") return false;
  if (env.TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS !== "yes") return false;
  if (env.DEPLOY_ALLOW_SHARED_OLD_VPS !== "yes") return false;
  if (input.host !== HTTP_STAGING_HOST) return false;
  if (input.internalQaHeader !== "yes") return false;

  try {
    const authUrl = new URL(env.AUTH_URL ?? "");
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
