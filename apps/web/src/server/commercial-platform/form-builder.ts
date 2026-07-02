import type { CommercialValidationResult, JsonRecord } from "./common";

export type BuilderFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "file";

export type BuilderCondition = {
  fieldKey: string;
  operator: "equals" | "not_equals" | "exists" | "contains";
  value?: unknown;
};

export type BuilderValidationRule = {
  message: string;
  type: "required" | "min" | "max" | "minLength" | "maxLength" | "pattern";
  value?: number | string;
};

export type BuilderField = {
  conditions?: BuilderCondition[];
  defaultValue?: unknown;
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  rules?: BuilderValidationRule[];
  type: BuilderFieldType;
};

export type BuilderSection = {
  fields: BuilderField[];
  key: string;
  label: string;
};

export type FormBuilderTemplate = {
  category: string;
  id: string;
  name: string;
  reusable: boolean;
  sections: BuilderSection[];
  version: number;
};

export interface FormBuilderEngine {
  validateTemplate(template: FormBuilderTemplate): CommercialValidationResult;
  validateSubmission(
    template: FormBuilderTemplate,
    values: JsonRecord,
  ): CommercialValidationResult;
}

