import type {
  BusinessExecutionContext,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type JsonMetadataValue =
  | string
  | number
  | boolean
  | null
  | JsonMetadataValue[]
  | { [key: string]: JsonMetadataValue };

export type JsonMetadata = Record<string, JsonMetadataValue>;

export type MetadataPrimitiveType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "json";

export type TypedMetadataField = {
  defaultValue?: JsonMetadataValue;
  description?: string;
  key: string;
  label: string;
  required: boolean;
  type: MetadataPrimitiveType;
};

export type TypedMetadataContract = {
  entityType: string;
  fields: TypedMetadataField[];
  id: string;
  version: number;
};

export interface UniversalMetadataEngine {
  describeContract(
    context: BusinessExecutionContext,
    entityType: string,
  ): Promise<TypedMetadataContract | null>;
  validateMetadata(
    context: BusinessExecutionContext,
    entity: BusinessReference,
    metadata: JsonMetadata,
  ): Promise<BusinessValidationResult>;
}

