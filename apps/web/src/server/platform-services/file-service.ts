import type { PlatformReference, PlatformScope, PlatformServiceContext, PlatformVisibility } from "./common";

export type FileDescriptor = {
  contentType: string;
  id: string;
  name: string;
  size: number;
  visibility: PlatformVisibility;
};

export type FileAccessRequest = {
  fileId: string;
  purpose: "download" | "preview" | "share";
  target?: PlatformReference;
};

export interface FileService {
  describeFile(
    context: PlatformServiceContext,
    fileId: string,
  ): Promise<FileDescriptor | null>;
  prepareAccess(
    context: PlatformServiceContext,
    request: FileAccessRequest,
  ): Promise<{ allowed: boolean; reason?: string }>;
  scopeFile(context: PlatformServiceContext, scope: PlatformScope): PlatformScope;
}
