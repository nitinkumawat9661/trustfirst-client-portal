import type { PlatformReference, PlatformServiceContext } from "./common";

export type MetadataField = {
  key: string;
  label: string;
  required: boolean;
  valueType: "string" | "number" | "boolean" | "date" | "json";
};

export type MetadataSchema = {
  fields: MetadataField[];
  id: string;
  targetType: string;
  version: number;
};

export type MetadataValidationResult = {
  issues: Array<{ key: string; message: string }>;
  valid: boolean;
};

export interface MetadataEngine {
  describeSchema(
    context: PlatformServiceContext,
    target: PlatformReference,
  ): Promise<MetadataSchema | null>;
  validateMetadata(
    context: PlatformServiceContext,
    schema: MetadataSchema,
    metadata: Record<string, unknown>,
  ): Promise<MetadataValidationResult>;
}
