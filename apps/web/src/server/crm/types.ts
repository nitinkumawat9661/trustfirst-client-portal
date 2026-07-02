import type { ClientLifecycleStage, ClientStatus } from "@trustfirst/database";

export type ClientSummary = {
  id: string;
  name: string;
  slug: string;
  lifecycleStage: ClientLifecycleStage;
  status: ClientStatus;
  healthScore: number;
  primaryContact?: {
    email: string;
    name: string;
  } | undefined;
  accountManager?: {
    id: string;
    name: string | null;
  } | undefined;
  tags: string[];
  updatedAt: Date;
};

export type ClientDashboardMetrics = {
  activeProjects: number;
  pendingApprovals: number;
  pendingRequirements: number;
  openTasks: number;
  recentFiles: number;
  recentActivity: number;
  healthScore: number;
};

export type ClientWorkspace = {
  client: ClientSummary & {
    legalName: string | null;
    website: string | null;
    industry: string | null;
    source: string | null;
    createdAt: Date;
  };
  metrics: ClientDashboardMetrics;
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    role: string | null;
    isPrimary: boolean;
    lastActivityAt: Date | null;
  }>;
  notes: Array<{
    id: string;
    title: string | null;
    body: string;
    createdAt: Date;
  }>;
  comments: Array<{
    id: string;
    body: string;
    parentId: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }>;
  activity: Array<{
    id: string;
    summary: string;
    verb: string;
    occurredAt: Date;
  }>;
};

export type ClientSearchResult = {
  clients: ClientSummary[];
  contacts: Array<{ clientId: string; email: string; id: string; name: string }>;
  notes: Array<{ clientId: string; id: string; title: string | null }>;
  comments: Array<{ clientId: string; id: string; excerpt: string }>;
};

export type CsvImportPreview = {
  rows: Array<{
    index: number;
    issues: string[];
    normalized: Record<string, string>;
  }>;
  validRows: number;
  invalidRows: number;
};

export type ExportPlan = {
  contentType: string;
  fileName: string;
  format: "csv" | "pdf";
  scope: "clients" | "client";
};
