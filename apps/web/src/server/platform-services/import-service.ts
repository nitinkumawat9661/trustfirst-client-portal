import type { PlatformReference, PlatformServiceContext } from "./common";

export type ImportFormat = "csv" | "json" | "xlsx";

export type ImportRequest = {
  format: ImportFormat;
  sourceFileId: string;
  target: PlatformReference;
};

export type ImportPlan = {
  estimatedRecords?: number;
  issues: Array<{ message: string; row?: number }>;
  valid: boolean;
};

export interface ImportService {
  inspectImport(
    context: PlatformServiceContext,
    request: ImportRequest,
  ): Promise<ImportPlan>;
  prepareImport(
    context: PlatformServiceContext,
    request: ImportRequest,
  ): Promise<{ accepted: boolean; reason?: string }>;
}
