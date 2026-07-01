import type { PlatformReference, PlatformServiceContext } from "./common";

export type AttachmentDescriptor = {
  fileId: string;
  id: string;
  label?: string;
  target: PlatformReference;
};

export type AttachmentPlan = {
  allowed: boolean;
  reason?: string;
  target: PlatformReference;
};

export interface AttachmentService {
  listForTarget(
    context: PlatformServiceContext,
    target: PlatformReference,
  ): Promise<AttachmentDescriptor[]>;
  planAttachment(
    context: PlatformServiceContext,
    target: PlatformReference,
  ): Promise<AttachmentPlan>;
}
