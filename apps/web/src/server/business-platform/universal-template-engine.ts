import type {
  BusinessExecutionContext,
  BusinessEntityId,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type BusinessTemplateType =
  | "requirement"
  | "project"
  | "client"
  | "document"
  | "notification"
  | "custom";

export type BusinessTemplateVariable = {
  defaultValue?: unknown;
  key: string;
  label: string;
  required: boolean;
};

export type BusinessTemplate = {
  contentType: "markdown" | "html" | "json" | "plain_text";
  description?: string;
  id: BusinessEntityId;
  name: string;
  templateType: BusinessTemplateType;
  variables: BusinessTemplateVariable[];
  version: number;
};

export type TemplateRenderRequest = {
  entity?: BusinessReference;
  templateId: BusinessEntityId;
  variables: Record<string, unknown>;
};

export type TemplateRenderPlan = {
  contentType: BusinessTemplate["contentType"];
  outputName: string;
  template: BusinessTemplate;
};

export interface UniversalTemplateEngine {
  describeTemplate(
    context: BusinessExecutionContext,
    templateId: BusinessEntityId,
  ): Promise<BusinessTemplate | null>;
  validateRenderRequest(
    context: BusinessExecutionContext,
    request: TemplateRenderRequest,
  ): Promise<BusinessValidationResult>;
  planRender(
    context: BusinessExecutionContext,
    request: TemplateRenderRequest,
  ): Promise<TemplateRenderPlan>;
}

