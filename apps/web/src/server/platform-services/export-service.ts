import type { PlatformReference, PlatformServiceContext } from "./common";

export type ExportFormat = "csv" | "json" | "xlsx" | "pdf";

export type ExportRequest = {
  format: ExportFormat;
  target: PlatformReference;
};

export type ExportArtifact = {
  contentType: string;
  filename: string;
  storageKey?: string;
};

export interface ExportService {
  planExport(
    context: PlatformServiceContext,
    request: ExportRequest,
  ): Promise<{ allowed: boolean; reason?: string }>;
  prepareExport(
    context: PlatformServiceContext,
    request: ExportRequest,
  ): Promise<ExportArtifact>;
}
