import type {
  CommercialContext,
  CommercialEntityRef,
  CommercialValidationResult,
  JsonRecord,
} from "./common";

export type CommercialDocumentKind =
  | "quotation"
  | "invoice"
  | "proposal"
  | "estimate"
  | "purchase_order"
  | "sales_order"
  | "contract"
  | "agreement"
  | "receipt"
  | "credit_note"
  | "debit_note"
  | "work_order"
  | "delivery_note"
  | string;

export type CommercialDocumentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "issued"
  | "void"
  | "archived";

export type DocumentNumberingRule = {
  padding: number;
  prefix: string;
  reset: "never" | "yearly" | "monthly";
  separator: string;
};

export type DocumentBrandingContract = {
  accentColor?: string;
  footerText?: string;
  logoUrl?: string;
  primaryColor?: string;
};

export type DocumentTemplateContract = {
  contentType: "html" | "markdown" | "json";
  id: string;
  name: string;
  variables: Array<{ key: string; required: boolean }>;
  version: number;
};

export type CommercialDocumentDefinition = {
  approvalPolicyId?: string;
  branding?: DocumentBrandingContract;
  kind: CommercialDocumentKind;
  numbering: DocumentNumberingRule;
  templateId: string;
  versioning: "immutable_versions" | "draft_versions";
};

export type CommercialDocument = {
  data: JsonRecord;
  definition: CommercialDocumentDefinition;
  id: string;
  number: string;
  source?: CommercialEntityRef;
  status: CommercialDocumentStatus;
  version: number;
};

export type DocumentRenderContract = {
  documentId: string;
  format: "pdf" | "docx";
  template: DocumentTemplateContract;
};

export interface CommercialDocumentEngine {
  describeDefinition(
    context: CommercialContext,
    kind: CommercialDocumentKind,
  ): Promise<CommercialDocumentDefinition | null>;
  validateDocument(
    context: CommercialContext,
    document: CommercialDocument,
  ): Promise<CommercialValidationResult>;
  planRender(
    context: CommercialContext,
    document: CommercialDocument,
    format: "pdf" | "docx",
  ): Promise<DocumentRenderContract>;
}

