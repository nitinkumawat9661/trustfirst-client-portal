import type {
  BusinessExecutionContext,
  BusinessEntityId,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type DocumentFormat = "pdf" | "docx" | "html" | "markdown" | "json";

export type DocumentSource = {
  entity?: BusinessReference;
  templateId?: BusinessEntityId;
  title: string;
  variables?: Record<string, unknown>;
};

export type PdfDocumentContract = {
  format: "pdf";
  pageSize: "a4" | "letter" | "legal";
  renderMode: "print" | "archive" | "preview";
};

export type DocxDocumentContract = {
  format: "docx";
  renderMode: "editable" | "locked" | "template";
};

export type DocumentExportContract = {
  format: DocumentFormat;
  source: DocumentSource;
};

export type DocumentExportPlan = {
  fileName: string;
  mimeType: string;
  source: DocumentSource;
  targetFormat: DocumentFormat;
};

export interface UniversalDocumentEngine {
  validateExport(
    context: BusinessExecutionContext,
    contract: DocumentExportContract,
  ): Promise<BusinessValidationResult>;
  planExport(
    context: BusinessExecutionContext,
    contract: DocumentExportContract,
  ): Promise<DocumentExportPlan>;
}

