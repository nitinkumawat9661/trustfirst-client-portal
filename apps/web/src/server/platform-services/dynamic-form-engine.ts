import type { PlatformServiceContext } from "./common";

export type DynamicFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "file";

export type DynamicFormField = {
  helpText?: string;
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  required: boolean;
  type: DynamicFormFieldType;
};

export type DynamicFormDefinition = {
  fields: DynamicFormField[];
  id: string;
  name: string;
  version: number;
};

export type DynamicFormValidationResult = {
  issues: Array<{
    fieldKey: string;
    message: string;
  }>;
  valid: boolean;
};

export interface DynamicFormEngine {
  describeForm(
    context: PlatformServiceContext,
    formId: string,
  ): Promise<DynamicFormDefinition | null>;
  validateSubmission(
    context: PlatformServiceContext,
    form: DynamicFormDefinition,
    values: Record<string, unknown>,
  ): Promise<DynamicFormValidationResult>;
}
