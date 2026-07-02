export type DeploymentReadinessItem = {
  description: string;
  key: string;
  ready: boolean;
  title: string;
};

export function deploymentReadinessChecklist(): DeploymentReadinessItem[] {
  return [
    {
      description: process.env.DATABASE_URL ? "DATABASE_URL is present." : "DATABASE_URL is required before preview or production deployment.",
      key: "database-url",
      ready: Boolean(process.env.DATABASE_URL),
      title: "Database URL",
    },
    {
      description: process.env.AUTH_SECRET ? "AUTH_SECRET is present." : "AUTH_SECRET must be configured with a strong value.",
      key: "auth-secret",
      ready: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32),
      title: "Auth secret",
    },
    {
      description: process.env.AUTH_URL ? "AUTH_URL is present for deployment callbacks." : "AUTH_URL should be set for preview and production callbacks.",
      key: "auth-url",
      ready: Boolean(process.env.AUTH_URL),
      title: "Auth URL",
    },
    {
      description: "Run Prisma migrations before opening the preview to stakeholders.",
      key: "migrations",
      ready: true,
      title: "Migration checklist",
    },
    {
      description: "Run lint, typecheck, build, tests, and Prisma generate before release.",
      key: "quality",
      ready: true,
      title: "Production build notes",
    },
  ];
}
