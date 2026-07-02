import type {
  CommercialDocumentStatus,
  CommercialDocumentTimelineVerb,
  CommercialDocumentType,
} from "@trustfirst/database";

export type CommercialDocumentSummary = {
  clientId: string | null;
  currentVersion: number;
  documentNumber: string;
  id: string;
  projectId: string | null;
  status: CommercialDocumentStatus;
  templateKey: string;
  title: string;
  type: CommercialDocumentType;
  updatedAt: Date;
};

export type CommercialDocumentWorkspace = CommercialDocumentSummary & {
  attachments: Array<{ id: string; name: string; version: number | null }>;
  branding: Record<string, unknown>;
  comments: Array<{
    body: string;
    id: string;
    parentId: string | null;
    resolvedAt: Date | null;
  }>;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  requirementId: string | null;
  summary: string | null;
  timeline: Array<{
    id: string;
    occurredAt: Date;
    summary: string;
    verb: CommercialDocumentTimelineVerb;
  }>;
  versions: Array<{ createdAt: Date; id: string; version: number }>;
};

export type CommercialDocumentExportContract = {
  columns: string[];
  filename: string;
  format: "csv";
  rows: Array<Record<string, string>>;
};

export type CommercialDocumentPdfRenderContract = {
  documentId: string;
  engine: "pdf";
  payload: Record<string, unknown>;
  templateKey: string;
};
