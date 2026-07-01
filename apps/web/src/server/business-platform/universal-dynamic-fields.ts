import type {
  BusinessExecutionContext,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type DynamicFieldType =
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "multi_select"
  | "checkbox"
  | "url"
  | "email"
  | "file";

export type DynamicFieldOption = {
  label: string;
  value: string;
};

export type DynamicFieldValidationContract = {
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  pattern?: string;
  required: boolean;
};

export type DynamicFieldDefinition = {
  entityType: string;
  helpText?: string;
  key: string;
  label: string;
  options?: DynamicFieldOption[];
  sortOrder: number;
  type: DynamicFieldType;
  validation: DynamicFieldValidationContract;
};

export type DynamicFieldValue = {
  fieldKey: string;
  value: unknown;
};

export interface UniversalDynamicFieldEngine {
  describeFields(
    context: BusinessExecutionContext,
    entityType: string,
  ): Promise<DynamicFieldDefinition[]>;
  validateValues(
    context: BusinessExecutionContext,
    entity: BusinessReference,
    values: DynamicFieldValue[],
  ): Promise<BusinessValidationResult>;
}

